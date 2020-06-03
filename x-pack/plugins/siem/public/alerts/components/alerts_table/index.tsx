/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiLoadingContent } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Dispatch } from 'redux';

import { Filter, esQuery } from '../../../../../../../src/plugins/data/public';
import { useFetchIndexPatterns } from '../../../alerts/containers/detection_engine/rules/fetch_index_patterns';
import { StatefulEventsViewer } from '../../../common/components/events_viewer';
import { HeaderSection } from '../../../common/components/header_section';
import { combineQueries } from '../../../timelines/components/timeline/helpers';
import { useKibana } from '../../../common/lib/kibana';
import { inputsSelectors, State, inputsModel } from '../../../common/store';
import { timelineActions, timelineSelectors } from '../../../timelines/store/timeline';
import { TimelineModel } from '../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { useApolloClient } from '../../../common/utils/apollo_context';

import { updateAlertStatusAction } from './actions';
import {
  getAlertActions,
  requiredFieldsForActions,
  alertsClosedFilters,
  alertsDefaultModel,
  alertsOpenFilters,
} from './default_config';
import {
  FILTER_CLOSED,
  FILTER_OPEN,
  AlertFilterOption,
  AlertsTableFilterGroup,
} from './alerts_filter_group';
import { AlertsUtilityBar } from './alerts_utility_bar';
import * as i18n from './translations';
import {
  CreateTimelineProps,
  SetEventsDeletedProps,
  SetEventsLoadingProps,
  UpdateAlertsStatusCallback,
  UpdateAlertsStatusProps,
} from './types';
import { dispatchUpdateTimeline } from '../../../timelines/components/open_timeline/helpers';
import {
  useStateToaster,
  displaySuccessToast,
  displayErrorToast,
} from '../../../common/components/toasters';

export const ALERTS_TABLE_TIMELINE_ID = 'alerts-table';

interface OwnProps {
  canUserCRUD: boolean;
  defaultFilters?: Filter[];
  hasIndexWrite: boolean;
  from: number;
  loading: boolean;
  signalsIndex: string;
  to: number;
}

type AlertsTableComponentProps = OwnProps & PropsFromRedux;

export const AlertsTableComponent: React.FC<AlertsTableComponentProps> = ({
  canUserCRUD,
  clearEventsDeleted,
  clearEventsLoading,
  clearSelected,
  defaultFilters,
  from,
  globalFilters,
  globalQuery,
  hasIndexWrite,
  isSelectAllChecked,
  loading,
  loadingEventIds,
  selectedEventIds,
  setEventsDeleted,
  setEventsLoading,
  signalsIndex,
  to,
  updateTimeline,
  updateTimelineIsLoading,
}) => {
  const [selectAll, setSelectAll] = useState(false);
  const apolloClient = useApolloClient();

  const [showClearSelectionAction, setShowClearSelectionAction] = useState(false);
  const [filterGroup, setFilterGroup] = useState<AlertFilterOption>(FILTER_OPEN);
  const [{ browserFields, indexPatterns }] = useFetchIndexPatterns(
    signalsIndex !== '' ? [signalsIndex] : []
  );
  const kibana = useKibana();
  const [, dispatchToaster] = useStateToaster();

  const getGlobalQuery = useCallback(() => {
    if (browserFields != null && indexPatterns != null) {
      return combineQueries({
        config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
        dataProviders: [],
        indexPattern: indexPatterns,
        browserFields,
        filters: isEmpty(defaultFilters)
          ? globalFilters
          : [...(defaultFilters ?? []), ...globalFilters],
        kqlQuery: globalQuery,
        kqlMode: globalQuery.language,
        start: from,
        end: to,
        isEventViewer: true,
      });
    }
    return null;
  }, [browserFields, globalFilters, globalQuery, indexPatterns, kibana, to, from]);

  // Callback for creating a new timeline -- utilized by row/batch actions
  const createTimelineCallback = useCallback(
    ({ from: fromTimeline, timeline, to: toTimeline, ruleNote }: CreateTimelineProps) => {
      updateTimelineIsLoading({ id: 'timeline-1', isLoading: false });
      updateTimeline({
        duplicate: true,
        from: fromTimeline,
        id: 'timeline-1',
        notes: [],
        timeline: {
          ...timeline,
          show: true,
        },
        to: toTimeline,
        ruleNote,
      })();
    },
    [updateTimeline, updateTimelineIsLoading]
  );

  const setEventsLoadingCallback = useCallback(
    ({ eventIds, isLoading }: SetEventsLoadingProps) => {
      setEventsLoading!({ id: ALERTS_TABLE_TIMELINE_ID, eventIds, isLoading });
    },
    [setEventsLoading, ALERTS_TABLE_TIMELINE_ID]
  );

  const setEventsDeletedCallback = useCallback(
    ({ eventIds, isDeleted }: SetEventsDeletedProps) => {
      setEventsDeleted!({ id: ALERTS_TABLE_TIMELINE_ID, eventIds, isDeleted });
    },
    [setEventsDeleted, ALERTS_TABLE_TIMELINE_ID]
  );

  const onAlertStatusUpdateSuccess = useCallback(
    (count: number, status: string) => {
      const title =
        status === 'closed'
          ? i18n.CLOSED_ALERT_SUCCESS_TOAST(count)
          : i18n.OPENED_ALERT_SUCCESS_TOAST(count);

      displaySuccessToast(title, dispatchToaster);
    },
    [dispatchToaster]
  );

  const onAlertStatusUpdateFailure = useCallback(
    (status: string, error: Error) => {
      const title =
        status === 'closed' ? i18n.CLOSED_ALERT_FAILED_TOAST : i18n.OPENED_ALERT_FAILED_TOAST;
      displayErrorToast(title, [error.message], dispatchToaster);
    },
    [dispatchToaster]
  );

  // Catches state change isSelectAllChecked->false upon user selection change to reset utility bar
  useEffect(() => {
    if (!isSelectAllChecked) {
      setShowClearSelectionAction(false);
    } else {
      setSelectAll(false);
    }
  }, [isSelectAllChecked]);

  // Callback for when open/closed filter changes
  const onFilterGroupChangedCallback = useCallback(
    (newFilterGroup: AlertFilterOption) => {
      clearEventsLoading!({ id: ALERTS_TABLE_TIMELINE_ID });
      clearEventsDeleted!({ id: ALERTS_TABLE_TIMELINE_ID });
      clearSelected!({ id: ALERTS_TABLE_TIMELINE_ID });
      setFilterGroup(newFilterGroup);
    },
    [clearEventsLoading, clearEventsDeleted, clearSelected, setFilterGroup]
  );

  // Callback for clearing entire selection from utility bar
  const clearSelectionCallback = useCallback(() => {
    clearSelected!({ id: ALERTS_TABLE_TIMELINE_ID });
    setSelectAll(false);
    setShowClearSelectionAction(false);
  }, [clearSelected, setSelectAll, setShowClearSelectionAction]);

  // Callback for selecting all events on all pages from utility bar
  // Dispatches to stateful_body's selectAll via TimelineTypeContext props
  // as scope of response data required to actually set selectedEvents
  const selectAllCallback = useCallback(() => {
    setSelectAll(true);
    setShowClearSelectionAction(true);
  }, [setSelectAll, setShowClearSelectionAction]);

  const updateAlertsStatusCallback: UpdateAlertsStatusCallback = useCallback(
    async (refetchQuery: inputsModel.Refetch, { alertIds, status }: UpdateAlertsStatusProps) => {
      await updateAlertStatusAction({
        query: showClearSelectionAction ? getGlobalQuery()?.filterQuery : undefined,
        alertIds: Object.keys(selectedEventIds),
        status,
        setEventsDeleted: setEventsDeletedCallback,
        setEventsLoading: setEventsLoadingCallback,
        onAlertStatusUpdateSuccess,
        onAlertStatusUpdateFailure,
      });
      refetchQuery();
    },
    [
      getGlobalQuery,
      selectedEventIds,
      setEventsDeletedCallback,
      setEventsLoadingCallback,
      showClearSelectionAction,
      onAlertStatusUpdateSuccess,
      onAlertStatusUpdateFailure,
    ]
  );

  // Callback for creating the AlertsUtilityBar which receives totalCount from EventsViewer component
  const utilityBarCallback = useCallback(
    (refetchQuery: inputsModel.Refetch, totalCount: number) => {
      return (
        <AlertsUtilityBar
          canUserCRUD={canUserCRUD}
          areEventsLoading={loadingEventIds.length > 0}
          clearSelection={clearSelectionCallback}
          hasIndexWrite={hasIndexWrite}
          isFilteredToOpen={filterGroup === FILTER_OPEN}
          selectAll={selectAllCallback}
          selectedEventIds={selectedEventIds}
          showClearSelection={showClearSelectionAction}
          totalCount={totalCount}
          updateAlertsStatus={updateAlertsStatusCallback.bind(null, refetchQuery)}
        />
      );
    },
    [
      canUserCRUD,
      hasIndexWrite,
      clearSelectionCallback,
      filterGroup,
      loadingEventIds.length,
      selectAllCallback,
      selectedEventIds,
      showClearSelectionAction,
      updateAlertsStatusCallback,
    ]
  );

  // Send to Timeline / Update Alert Status Actions for each table row
  const additionalActions = useMemo(
    () =>
      getAlertActions({
        apolloClient,
        canUserCRUD,
        hasIndexWrite,
        createTimeline: createTimelineCallback,
        setEventsLoading: setEventsLoadingCallback,
        setEventsDeleted: setEventsDeletedCallback,
        status: filterGroup === FILTER_OPEN ? FILTER_CLOSED : FILTER_OPEN,
        updateTimelineIsLoading,
        onAlertStatusUpdateSuccess,
        onAlertStatusUpdateFailure,
      }),
    [
      apolloClient,
      canUserCRUD,
      createTimelineCallback,
      hasIndexWrite,
      filterGroup,
      setEventsLoadingCallback,
      setEventsDeletedCallback,
      updateTimelineIsLoading,
      onAlertStatusUpdateSuccess,
      onAlertStatusUpdateFailure,
    ]
  );

  const defaultIndices = useMemo(() => [signalsIndex], [signalsIndex]);
  const defaultFiltersMemo = useMemo(() => {
    if (isEmpty(defaultFilters)) {
      return filterGroup === FILTER_OPEN ? alertsOpenFilters : alertsClosedFilters;
    } else if (defaultFilters != null && !isEmpty(defaultFilters)) {
      return [
        ...defaultFilters,
        ...(filterGroup === FILTER_OPEN ? alertsOpenFilters : alertsClosedFilters),
      ];
    }
  }, [defaultFilters, filterGroup]);

  const timelineTypeContext = useMemo(
    () => ({
      documentType: i18n.ALERTS_DOCUMENT_TYPE,
      footerText: i18n.TOTAL_COUNT_OF_ALERTS,
      loadingText: i18n.LOADING_ALERTS,
      queryFields: requiredFieldsForActions,
      timelineActions: additionalActions,
      title: i18n.ALERTS_TABLE_TITLE,
      selectAll: canUserCRUD ? selectAll : false,
    }),
    [additionalActions, canUserCRUD, selectAll]
  );

  const headerFilterGroup = useMemo(
    () => <AlertsTableFilterGroup onFilterGroupChanged={onFilterGroupChangedCallback} />,
    [onFilterGroupChangedCallback]
  );

  if (loading || isEmpty(signalsIndex)) {
    return (
      <EuiPanel>
        <HeaderSection title={i18n.ALERTS_TABLE_TITLE} />
        <EuiLoadingContent data-test-subj="loading-alerts-panel" />
      </EuiPanel>
    );
  }

  return (
    <StatefulEventsViewer
      defaultIndices={defaultIndices}
      pageFilters={defaultFiltersMemo}
      defaultModel={alertsDefaultModel}
      end={to}
      headerFilterGroup={headerFilterGroup}
      id={ALERTS_TABLE_TIMELINE_ID}
      start={from}
      timelineTypeContext={timelineTypeContext}
      utilityBar={utilityBarCallback}
    />
  );
};

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getGlobalInputs = inputsSelectors.globalSelector();
  const mapStateToProps = (state: State) => {
    const timeline: TimelineModel =
      getTimeline(state, ALERTS_TABLE_TIMELINE_ID) ?? timelineDefaults;
    const { deletedEventIds, isSelectAllChecked, loadingEventIds, selectedEventIds } = timeline;

    const globalInputs: inputsModel.InputsRange = getGlobalInputs(state);
    const { query, filters } = globalInputs;
    return {
      globalQuery: query,
      globalFilters: filters,
      deletedEventIds,
      isSelectAllChecked,
      loadingEventIds,
      selectedEventIds,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  clearSelected: ({ id }: { id: string }) => dispatch(timelineActions.clearSelected({ id })),
  setEventsLoading: ({
    id,
    eventIds,
    isLoading,
  }: {
    id: string;
    eventIds: string[];
    isLoading: boolean;
  }) => dispatch(timelineActions.setEventsLoading({ id, eventIds, isLoading })),
  clearEventsLoading: ({ id }: { id: string }) =>
    dispatch(timelineActions.clearEventsLoading({ id })),
  setEventsDeleted: ({
    id,
    eventIds,
    isDeleted,
  }: {
    id: string;
    eventIds: string[];
    isDeleted: boolean;
  }) => dispatch(timelineActions.setEventsDeleted({ id, eventIds, isDeleted })),
  clearEventsDeleted: ({ id }: { id: string }) =>
    dispatch(timelineActions.clearEventsDeleted({ id })),
  updateTimelineIsLoading: ({ id, isLoading }: { id: string; isLoading: boolean }) =>
    dispatch(timelineActions.updateIsLoading({ id, isLoading })),
  updateTimeline: dispatchUpdateTimeline(dispatch),
});

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const AlertsTable = connector(React.memo(AlertsTableComponent));
