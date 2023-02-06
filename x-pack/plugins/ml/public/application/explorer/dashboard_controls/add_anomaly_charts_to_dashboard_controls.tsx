/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFieldNumber, EuiFormRow, htmlIdGenerator } from '@elastic/eui';
import type { Query } from '@kbn/es-query';
import useObservable from 'react-use/lib/useObservable';
import { isDefined } from '@kbn/ml-is-defined';
import { getSelectionInfluencers } from '../explorer_utils';
import { useAnomalyExplorerContext } from '../anomaly_explorer_context';
import { escapeKueryForFieldValuePair } from '../../util/string_utils';
import { SEARCH_QUERY_LANGUAGE } from '../../../../common/constants/search';
import { useDashboardTable } from './use_dashboards_table';
import { AddToDashboardControl } from './add_to_dashboard_controls';
import { useAddToDashboardActions } from './use_add_to_dashboard_actions';
import { DEFAULT_MAX_SERIES_TO_PLOT } from '../../services/anomaly_explorer_charts_service';
import { JobId } from '../../../../common/types/anomaly_detection_jobs';
import { ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE } from '../../../embeddables';
import { getDefaultExplorerChartsPanelTitle } from '../../../embeddables/anomaly_charts/anomaly_charts_embeddable';
import { useTableSeverity } from '../../components/controls/select_severity';
import { MAX_ANOMALY_CHARTS_ALLOWED } from '../../../embeddables/anomaly_charts/anomaly_charts_initializer';

function getDefaultEmbeddablePanelConfig(jobIds: JobId[], queryString?: string) {
  return {
    id: htmlIdGenerator()(),
    title: getDefaultExplorerChartsPanelTitle(jobIds).concat(queryString ? `- ${queryString}` : ''),
  };
}

export interface AddToDashboardControlProps {
  jobIds: string[];
  onClose: (callback?: () => Promise<void>) => void;
}

/**
 * Component for attaching anomaly swim lane embeddable to dashboards.
 */
export const AddAnomalyChartsToDashboardControl: FC<AddToDashboardControlProps> = ({
  onClose,
  jobIds,
}) => {
  const [severity] = useTableSeverity();
  const [maxSeriesToPlot, setMaxSeriesToPlot] = useState(DEFAULT_MAX_SERIES_TO_PLOT);
  const { anomalyExplorerCommonStateService, anomalyTimelineStateService } =
    useAnomalyExplorerContext();
  const { queryString } = useObservable(
    anomalyExplorerCommonStateService.getFilterSettings$(),
    anomalyExplorerCommonStateService.getFilterSettings()
  );

  const selectedCells = useObservable(
    anomalyTimelineStateService.getSelectedCells$(),
    anomalyTimelineStateService.getSelectedCells()
  );

  const getEmbeddableInput = useCallback(() => {
    // Respect the query and the influencers selected
    // If no query or filter set, filter out to the lanes the selected cells
    // And if no selected cells, show everything

    const selectionInfluencers = getSelectionInfluencers(
      selectedCells,
      selectedCells?.viewByFieldName!
    );

    const influencers = selectionInfluencers ?? [];
    const config = getDefaultEmbeddablePanelConfig(jobIds, queryString);
    const queryFromSelectedCells = influencers
      .map((s) => escapeKueryForFieldValuePair(s.fieldName, s.fieldValue))
      .join(' or ');

    // When adding anomaly charts to Dashboard, we want to respect the Dashboard's time range
    // so we are not passing the time range here
    return {
      ...config,
      jobIds,
      maxSeriesToPlot: maxSeriesToPlot ?? DEFAULT_MAX_SERIES_TO_PLOT,
      severityThreshold: severity.val,
      ...((isDefined(queryString) && queryString !== '') ||
      (queryFromSelectedCells !== undefined && queryFromSelectedCells !== '')
        ? {
            query: {
              query: queryString === '' ? queryFromSelectedCells : queryString,
              language: SEARCH_QUERY_LANGUAGE.KUERY,
            } as Query,
          }
        : {}),
    };
  }, [jobIds, maxSeriesToPlot, severity, queryString, selectedCells]);

  const { dashboardItems, isLoading, search } = useDashboardTable();
  const { addToDashboardAndEditCallback } = useAddToDashboardActions(
    ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
    getEmbeddableInput
  );
  const title = (
    <FormattedMessage
      id="xpack.ml.explorer.addToDashboard.anomalyCharts.dashboardsTitle"
      defaultMessage="Add anomaly charts to dashboards"
    />
  );

  const extraControls = (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.ml.explorer.addToDashboard.anomalyCharts.maxSeriesToPlotLabel"
          defaultMessage="Maximum number of series to plot"
        />
      }
    >
      <EuiFieldNumber
        data-test-subj="mlAnomalyChartsInitializerMaxSeries"
        id="selectMaxSeriesToPlot"
        name="selectMaxSeriesToPlot"
        value={maxSeriesToPlot}
        onChange={(e) => setMaxSeriesToPlot(parseInt(e.target.value, 10))}
        min={0}
        max={MAX_ANOMALY_CHARTS_ALLOWED}
      />
    </EuiFormRow>
  );

  return (
    <AddToDashboardControl
      onClose={onClose}
      dashboardItems={dashboardItems}
      isLoading={isLoading}
      search={search}
      addToDashboardAndEditCallback={addToDashboardAndEditCallback}
      disabled={false}
      title={title}
    >
      {extraControls}
    </AddToDashboardControl>
  );
};
