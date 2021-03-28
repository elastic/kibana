/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { formatDate } from '@elastic/eui';
import { useDashboardTable } from './use_dashboards_table';
import { AddToDashboardControl } from './add_to_dashboard_controls';
import { useAddToDashboardActions } from './use_add_to_dashboard_actions';
import { AppStateSelectedCells, getSelectionTimeRange } from '../explorer_utils';
import { TimeRange } from '../../../../../../../src/plugins/data/common/query';
import { DEFAULT_MAX_SERIES_TO_PLOT } from '../../services/anomaly_explorer_charts_service';
import { JobId } from '../../../../common/types/anomaly_detection_jobs';
import { ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE } from '../../../embeddables';
import { getDefaultExplorerChartsPanelTitle } from '../../../embeddables/anomaly_charts/anomaly_charts_embeddable';
import { TimeRangeBounds } from '../../util/time_buckets';
import { useTableSeverity } from '../../components/controls/select_severity';

function getDefaultEmbeddablePanelConfig(jobIds: JobId[]) {
  return {
    type: ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
    title: getDefaultExplorerChartsPanelTitle(jobIds),
  };
}

export interface AddToDashboardControlProps {
  jobIds: string[];
  selectedCells: AppStateSelectedCells;
  bounds: TimeRangeBounds;
  interval: number;
  onClose: (callback?: () => Promise<any>) => void;
}

/**
 * Component for attaching anomaly swim lane embeddable to dashboards.
 */
export const AddAnomalyChartsToDashboardControl: FC<AddToDashboardControlProps> = ({
  onClose,
  jobIds,
  selectedCells,
  bounds,
  interval,
}) => {
  const [severity] = useTableSeverity();

  const getPanelsData = useCallback(async () => {
    const { earliestMs, latestMs } = getSelectionTimeRange(selectedCells, interval, bounds);
    const timeRange: TimeRange = {
      from: formatDate(earliestMs, 'MMM D, YYYY @ HH:mm:ss.SSS'),
      to: formatDate(latestMs, 'MMM D, YYYY @ HH:mm:ss.SSS'),
      mode: 'absolute',
    };

    const config = getDefaultEmbeddablePanelConfig(jobIds);
    return [
      {
        ...config,
        embeddableConfig: {
          jobIds,
          maxSeriesToPlot: DEFAULT_MAX_SERIES_TO_PLOT,
          severityThreshold: severity.val,
          timeRange,
        },
      },
    ];
  }, [selectedCells, interval, bounds]);

  const { selectedItems, selection, dashboardItems, isLoading, search } = useDashboardTable();
  const { addToDashboardAndEditCallback, addToDashboardCallback } = useAddToDashboardActions({
    onClose,
    getPanelsData,
    selectedDashboards: selectedItems,
  });
  const title = (
    <FormattedMessage
      id="xpack.ml.explorer.anomalies.dashboardsTitle"
      defaultMessage="Add anomaly charts to dashboards"
    />
  );

  const disabled = selectedItems.length < 1 && !Array.isArray(jobIds === undefined);
  return (
    <AddToDashboardControl
      onClose={onClose}
      selectedItems={selectedItems}
      selection={selection}
      dashboardItems={dashboardItems}
      isLoading={isLoading}
      search={search}
      addToDashboardAndEditCallback={addToDashboardAndEditCallback}
      addToDashboardCallback={addToDashboardCallback}
      disabled={disabled}
      title={title}
    />
  );
};
