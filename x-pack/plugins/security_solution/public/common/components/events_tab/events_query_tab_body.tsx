/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { EuiCheckbox } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type { TableId } from '../../../../common/types';
import { dataTableActions } from '../../store/data_table';
import { RowRendererId } from '../../../../common/types/timeline';
import { StatefulEventsViewer } from '../events_viewer';
import { eventsDefaultModel } from '../events_viewer/default_model';
import { MatrixHistogram } from '../matrix_histogram';
import { useGlobalFullScreen } from '../../containers/use_full_screen';
import * as i18n from './translations';
import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import {
  alertsHistogramConfig,
  eventsHistogramConfig,
  getSubtitleFunction,
} from './histogram_configurations';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { defaultCellActions } from '../../lib/cell_actions/default_cell_actions';
import type { GlobalTimeArgs } from '../../containers/use_global_time';
import type { QueryTabBodyProps as UserQueryTabBodyProps } from '../../../explore/users/pages/navigation/types';
import type { QueryTabBodyProps as HostQueryTabBodyProps } from '../../../explore/hosts/pages/navigation/types';
import type { QueryTabBodyProps as NetworkQueryTabBodyProps } from '../../../explore/network/pages/navigation/types';
import { useLicense } from '../../hooks/use_license';

import { useUiSetting$ } from '../../lib/kibana';
import { defaultAlertsFilters } from '../events_viewer/external_alerts_filter';
import { useAddBulkToTimelineAction } from '../../../detections/components/alerts_table/timeline_actions/use_add_bulk_to_timeline';

import {
  useGetInitialUrlParamValue,
  useReplaceUrlParams,
} from '../../utils/global_query_string/helpers';
import type { BulkActionsProp } from '../toolbar/bulk_actions/types';

export const ALERTS_EVENTS_HISTOGRAM_ID = 'alertsOrEventsHistogramQuery';

type QueryTabBodyProps = UserQueryTabBodyProps | HostQueryTabBodyProps | NetworkQueryTabBodyProps;

export type EventsQueryTabBodyComponentProps = QueryTabBodyProps & {
  additionalFilters: Filter[];
  deleteQuery?: GlobalTimeArgs['deleteQuery'];
  indexNames: string[];
  setQuery: GlobalTimeArgs['setQuery'];
  tableId: TableId;
};

const EXTERNAL_ALERTS_URL_PARAM = 'onlyExternalAlerts';

const EventsQueryTabBodyComponent: React.FC<EventsQueryTabBodyComponentProps> = ({
  additionalFilters,
  deleteQuery,
  endDate,
  filterQuery,
  indexNames,
  setQuery,
  startDate,
  tableId,
}) => {
  const dispatch = useDispatch();
  const { globalFullScreen } = useGlobalFullScreen();
  const tGridEnabled = useIsExperimentalFeatureEnabled('tGridEnabled');
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const isEnterprisePlus = useLicense().isEnterprise();
  const ACTION_BUTTON_COUNT = isEnterprisePlus ? 5 : 4;
  const leadingControlColumns = useMemo(
    () => getDefaultControlColumn(ACTION_BUTTON_COUNT),
    [ACTION_BUTTON_COUNT]
  );

  const showExternalAlertsInitialUrlState = useExternalAlertsInitialUrlState();

  const [showExternalAlerts, setShowExternalAlerts] = useState(
    showExternalAlertsInitialUrlState ?? false
  );

  useSyncExternalAlertsUrlState(showExternalAlerts);

  const toggleExternalAlerts = useCallback(() => setShowExternalAlerts((s) => !s), []);
  const getHistogramSubtitle = useMemo(
    () => getSubtitleFunction(defaultNumberFormat, showExternalAlerts),
    [defaultNumberFormat, showExternalAlerts]
  );

  useEffect(() => {
    dispatch(
      dataTableActions.initializeDataTableSettings({
        id: tableId,
        defaultColumns: eventsDefaultModel.columns.map((c) =>
          !tGridEnabled && c.initialWidth == null
            ? {
                ...c,
                initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
              }
            : c
        ),
        title: i18n.EVENTS_GRAPH_TITLE,
        showCheckboxes: true,
        selectAll: true,
      })
    );
  }, [dispatch, showExternalAlerts, tGridEnabled, tableId]);

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ALERTS_EVENTS_HISTOGRAM_ID });
      }
    };
  }, [deleteQuery]);

  const toggleExternalAlertsCheckbox = useMemo(
    () => (
      <EuiCheckbox
        id="showExternalAlertsCheckbox"
        data-test-subj="showExternalAlertsCheckbox"
        aria-label={i18n.SHOW_EXTERNAL_ALERTS}
        checked={showExternalAlerts}
        color="text"
        label={i18n.SHOW_EXTERNAL_ALERTS}
        onChange={toggleExternalAlerts}
      />
    ),
    [showExternalAlerts, toggleExternalAlerts]
  );

  const defaultModel = useMemo(
    () => ({
      ...eventsDefaultModel,
      excludedRowRendererIds: showExternalAlerts ? Object.values(RowRendererId) : [],
    }),
    [showExternalAlerts]
  );

  const composedPageFilters = useMemo(
    () => (showExternalAlerts ? [defaultAlertsFilters, ...additionalFilters] : additionalFilters),
    [additionalFilters, showExternalAlerts]
  );

  const addBulkToTimelineAction = useAddBulkToTimelineAction({
    localFilters: composedPageFilters,
    tableId,
    from: startDate,
    to: endDate,
    scopeId: SourcererScopeName.default,
  });

  const bulkActions = useMemo<BulkActionsProp | boolean>(() => {
    return {
      alertStatusActions: false,
      customBulkActions: [addBulkToTimelineAction],
    };
  }, [addBulkToTimelineAction]);

  return (
    <>
      {!globalFullScreen && (
        <MatrixHistogram
          id={ALERTS_EVENTS_HISTOGRAM_ID}
          startDate={startDate}
          endDate={endDate}
          filterQuery={filterQuery}
          indexNames={indexNames}
          setQuery={setQuery}
          {...(showExternalAlerts ? alertsHistogramConfig : eventsHistogramConfig)}
          subtitle={getHistogramSubtitle}
        />
      )}
      <StatefulEventsViewer
        additionalFilters={toggleExternalAlertsCheckbox}
        defaultCellActions={defaultCellActions}
        start={startDate}
        end={endDate}
        leadingControlColumns={leadingControlColumns}
        renderCellValue={DefaultCellRenderer}
        rowRenderers={defaultRowRenderers}
        sourcererScope={SourcererScopeName.default}
        tableId={tableId}
        unit={showExternalAlerts ? i18n.EXTERNAL_ALERTS_UNIT : i18n.EVENTS_UNIT}
        defaultModel={defaultModel}
        pageFilters={composedPageFilters}
        bulkActions={bulkActions}
      />
    </>
  );
};

EventsQueryTabBodyComponent.displayName = 'EventsQueryTabBodyComponent';

export const EventsQueryTabBody = React.memo(EventsQueryTabBodyComponent);

EventsQueryTabBody.displayName = 'EventsQueryTabBody';

const useExternalAlertsInitialUrlState = () => {
  const replaceUrlParams = useReplaceUrlParams();

  const getInitialUrlParamValue = useGetInitialUrlParamValue<boolean>(EXTERNAL_ALERTS_URL_PARAM);

  const { decodedParam: showExternalAlertsInitialUrlState } = useMemo(
    () => getInitialUrlParamValue(),
    [getInitialUrlParamValue]
  );

  useEffect(() => {
    // Only called on component unmount
    return () => {
      replaceUrlParams([
        {
          key: EXTERNAL_ALERTS_URL_PARAM,
          value: null,
        },
      ]);
    };
  }, [replaceUrlParams]);

  return showExternalAlertsInitialUrlState;
};

/**
 * Update URL state when showExternalAlerts value changes
 */
const useSyncExternalAlertsUrlState = (showExternalAlerts: boolean) => {
  const replaceUrlParams = useReplaceUrlParams();
  useEffect(() => {
    replaceUrlParams([
      {
        key: EXTERNAL_ALERTS_URL_PARAM,
        value: showExternalAlerts ? 'true' : null,
      },
    ]);
  }, [showExternalAlerts, replaceUrlParams]);
};
