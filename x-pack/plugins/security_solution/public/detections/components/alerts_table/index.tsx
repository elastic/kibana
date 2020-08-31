/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiLoadingContent } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { connect, ConnectedProps, useDispatch } from 'react-redux';
import { Dispatch } from 'redux';

import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { Filter, esQuery } from '../../../../../../../src/plugins/data/public';
import { TimelineIdLiteral } from '../../../../common/types/timeline';
import { useFetchIndexPatterns } from '../../containers/detection_engine/rules/fetch_index_patterns';
import { StatefulEventsViewer } from '../../../common/components/events_viewer';
import { HeaderSection } from '../../../common/components/header_section';
import { combineQueries } from '../../../timelines/components/timeline/helpers';
import { useKibana } from '../../../common/lib/kibana';
import { inputsSelectors, State, inputsModel } from '../../../common/store';
import { timelineActions, timelineSelectors } from '../../../timelines/store/timeline';
import { TimelineModel } from '../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import {
  useManageTimeline,
  TimelineRowActionArgs,
} from '../../../timelines/components/manage_timeline';
import { useApolloClient } from '../../../common/utils/apollo_context';

import { updateAlertStatusAction } from './actions';
import {
  getAlertActions,
  requiredFieldsForActions,
  alertsDefaultModel,
  buildAlertStatusFilter,
} from './default_config';
import { FILTER_OPEN, AlertsTableFilterGroup } from './alerts_filter_group';
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
import { getInvestigateInResolverAction } from '../../../timelines/components/timeline/body/helpers';
import {
  AddExceptionModal,
  AddExceptionModalBaseProps,
} from '../../../common/components/exceptions/add_exception_modal';

interface OwnProps {
  timelineId: TimelineIdLiteral;
  canUserCRUD: boolean;
  defaultFilters?: Filter[];
  hasIndexWrite: boolean;
  from: string;
  loading: boolean;
  showBuildingBlockAlerts: boolean;
  onShowBuildingBlockAlertsChanged: (showBuildingBlockAlerts: boolean) => void;
  signalsIndex: string;
  to: string;
}

type AlertsTableComponentProps = OwnProps & PropsFromRedux;

const addExceptionModalInitialState: AddExceptionModalBaseProps = {
  ruleName: '',
  ruleId: '',
  ruleIndices: [],
  exceptionListType: 'detection',
  alertData: undefined,
};

export const AlertsTableComponent: React.FC<AlertsTableComponentProps> = ({
  timelineId,
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
  showBuildingBlockAlerts,
  onShowBuildingBlockAlertsChanged,
  signalsIndex,
  to,
  updateTimeline,
  updateTimelineIsLoading,
}) => {
  const dispatch = useDispatch();
  const apolloClient = useApolloClient();

  const [showClearSelectionAction, setShowClearSelectionAction] = useState(false);
  const [filterGroup, setFilterGroup] = useState<Status>(FILTER_OPEN);
  const [shouldShowAddExceptionModal, setShouldShowAddExceptionModal] = useState(false);
  const [addExceptionModalState, setAddExceptionModalState] = useState<AddExceptionModalBaseProps>(
    addExceptionModalInitialState
  );
  const [{ browserFields, indexPatterns, isLoading: indexPatternsLoading }] = useFetchIndexPatterns(
    signalsIndex !== '' ? [signalsIndex] : [],
    'alerts_table'
  );
  const kibana = useKibana();
  const [, dispatchToaster] = useStateToaster();
  const {
    initializeTimeline,
    setSelectAll,
    setTimelineRowActions,
    setIndexToAdd,
  } = useManageTimeline();

  const getGlobalQuery = useCallback(
    (customFilters: Filter[]) => {
      if (browserFields != null && indexPatterns != null) {
        return combineQueries({
          config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
          dataProviders: [],
          indexPattern: indexPatterns,
          browserFields,
          filters: isEmpty(defaultFilters)
            ? [...globalFilters, ...customFilters]
            : [...(defaultFilters ?? []), ...globalFilters, ...customFilters],
          kqlQuery: globalQuery,
          kqlMode: globalQuery.language,
          start: from,
          end: to,
          isEventViewer: true,
        });
      }
      return null;
    },
    [browserFields, defaultFilters, globalFilters, globalQuery, indexPatterns, kibana, to, from]
  );

  // Callback for creating a new timeline -- utilized by row/batch actions
  const createTimelineCallback = useCallback(
    ({ from: fromTimeline, timeline, to: toTimeline, ruleNote, notes }: CreateTimelineProps) => {
      updateTimelineIsLoading({ id: 'timeline-1', isLoading: false });
      updateTimeline({
        duplicate: true,
        forceNotes: true,
        from: fromTimeline,
        id: 'timeline-1',
        notes,
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
      setEventsLoading!({ id: timelineId, eventIds, isLoading });
    },
    [setEventsLoading, timelineId]
  );

  const setEventsDeletedCallback = useCallback(
    ({ eventIds, isDeleted }: SetEventsDeletedProps) => {
      setEventsDeleted!({ id: timelineId, eventIds, isDeleted });
    },
    [setEventsDeleted, timelineId]
  );

  const onAlertStatusUpdateSuccess = useCallback(
    (count: number, status: Status) => {
      let title: string;
      switch (status) {
        case 'closed':
          title = i18n.CLOSED_ALERT_SUCCESS_TOAST(count);
          break;
        case 'open':
          title = i18n.OPENED_ALERT_SUCCESS_TOAST(count);
          break;
        case 'in-progress':
          title = i18n.IN_PROGRESS_ALERT_SUCCESS_TOAST(count);
      }
      displaySuccessToast(title, dispatchToaster);
    },
    [dispatchToaster]
  );

  const onAlertStatusUpdateFailure = useCallback(
    (status: Status, error: Error) => {
      let title: string;
      switch (status) {
        case 'closed':
          title = i18n.CLOSED_ALERT_FAILED_TOAST;
          break;
        case 'open':
          title = i18n.OPENED_ALERT_FAILED_TOAST;
          break;
        case 'in-progress':
          title = i18n.IN_PROGRESS_ALERT_FAILED_TOAST;
      }
      displayErrorToast(title, [error.message], dispatchToaster);
    },
    [dispatchToaster]
  );

  const openAddExceptionModalCallback = useCallback(
    ({
      ruleName,
      ruleIndices,
      ruleId,
      exceptionListType,
      alertData,
    }: AddExceptionModalBaseProps) => {
      if (alertData != null) {
        setShouldShowAddExceptionModal(true);
        setAddExceptionModalState({
          ruleName,
          ruleId,
          ruleIndices,
          exceptionListType,
          alertData,
        });
      }
    },
    [setShouldShowAddExceptionModal, setAddExceptionModalState]
  );

  // Catches state change isSelectAllChecked->false upon user selection change to reset utility bar
  useEffect(() => {
    if (isSelectAllChecked) {
      setSelectAll({
        id: timelineId,
        selectAll: false,
      });
    } else {
      setShowClearSelectionAction(false);
    }
  }, [isSelectAllChecked, setSelectAll, timelineId]);

  // Callback for when open/closed filter changes
  const onFilterGroupChangedCallback = useCallback(
    (newFilterGroup: Status) => {
      clearEventsLoading!({ id: timelineId });
      clearEventsDeleted!({ id: timelineId });
      clearSelected!({ id: timelineId });
      setFilterGroup(newFilterGroup);
    },
    [clearEventsLoading, clearEventsDeleted, clearSelected, setFilterGroup, timelineId]
  );

  // Callback for clearing entire selection from utility bar
  const clearSelectionCallback = useCallback(() => {
    clearSelected!({ id: timelineId });
    setSelectAll({
      id: timelineId,
      selectAll: false,
    });
    setShowClearSelectionAction(false);
  }, [clearSelected, setSelectAll, setShowClearSelectionAction, timelineId]);

  // Callback for selecting all events on all pages from utility bar
  // Dispatches to stateful_body's selectAll via TimelineTypeContext props
  // as scope of response data required to actually set selectedEvents
  const selectAllOnAllPagesCallback = useCallback(() => {
    setSelectAll({
      id: timelineId,
      selectAll: true,
    });
    setShowClearSelectionAction(true);
  }, [setSelectAll, setShowClearSelectionAction, timelineId]);

  const updateAlertsStatusCallback: UpdateAlertsStatusCallback = useCallback(
    async (
      refetchQuery: inputsModel.Refetch,
      { status, selectedStatus }: UpdateAlertsStatusProps
    ) => {
      const currentStatusFilter = buildAlertStatusFilter(status);
      await updateAlertStatusAction({
        query: showClearSelectionAction
          ? getGlobalQuery(currentStatusFilter)?.filterQuery
          : undefined,
        alertIds: Object.keys(selectedEventIds),
        status,
        selectedStatus,
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
          currentFilter={filterGroup}
          selectAll={selectAllOnAllPagesCallback}
          selectedEventIds={selectedEventIds}
          showBuildingBlockAlerts={showBuildingBlockAlerts}
          onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChanged}
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
      showBuildingBlockAlerts,
      onShowBuildingBlockAlertsChanged,
      loadingEventIds.length,
      selectAllOnAllPagesCallback,
      selectedEventIds,
      showClearSelectionAction,
      updateAlertsStatusCallback,
    ]
  );

  // Send to Timeline / Update Alert Status Actions for each table row
  const additionalActions = useMemo(
    () => ({ ecsData, nonEcsData }: TimelineRowActionArgs) =>
      getAlertActions({
        apolloClient,
        canUserCRUD,
        createTimeline: createTimelineCallback,
        ecsRowData: ecsData,
        nonEcsRowData: nonEcsData,
        dispatch,
        hasIndexWrite,
        onAlertStatusUpdateFailure,
        onAlertStatusUpdateSuccess,
        setEventsDeleted: setEventsDeletedCallback,
        setEventsLoading: setEventsLoadingCallback,
        status: filterGroup,
        timelineId,
        updateTimelineIsLoading,
        openAddExceptionModal: openAddExceptionModalCallback,
      }),
    [
      apolloClient,
      canUserCRUD,
      createTimelineCallback,
      dispatch,
      hasIndexWrite,
      filterGroup,
      setEventsLoadingCallback,
      setEventsDeletedCallback,
      timelineId,
      updateTimelineIsLoading,
      onAlertStatusUpdateSuccess,
      onAlertStatusUpdateFailure,
      openAddExceptionModalCallback,
    ]
  );
  const defaultIndices = useMemo(() => [signalsIndex], [signalsIndex]);
  const defaultFiltersMemo = useMemo(() => {
    if (isEmpty(defaultFilters)) {
      return buildAlertStatusFilter(filterGroup);
    } else if (defaultFilters != null && !isEmpty(defaultFilters)) {
      return [...defaultFilters, ...buildAlertStatusFilter(filterGroup)];
    }
  }, [defaultFilters, filterGroup]);
  const { filterManager } = useKibana().services.data.query;

  useEffect(() => {
    initializeTimeline({
      defaultModel: alertsDefaultModel,
      documentType: i18n.ALERTS_DOCUMENT_TYPE,
      filterManager,
      footerText: i18n.TOTAL_COUNT_OF_ALERTS,
      id: timelineId,
      indexToAdd: defaultIndices,
      loadingText: i18n.LOADING_ALERTS,
      selectAll: false,
      timelineRowActions: () => [getInvestigateInResolverAction({ dispatch, timelineId })],
      title: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTimelineRowActions({
      id: timelineId,
      queryFields: requiredFieldsForActions,
      timelineRowActions: additionalActions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [additionalActions]);

  useEffect(() => {
    setIndexToAdd({ id: timelineId, indexToAdd: defaultIndices });
  }, [timelineId, defaultIndices, setIndexToAdd]);

  const headerFilterGroup = useMemo(
    () => <AlertsTableFilterGroup onFilterGroupChanged={onFilterGroupChangedCallback} />,
    [onFilterGroupChangedCallback]
  );

  const closeAddExceptionModal = useCallback(() => {
    setShouldShowAddExceptionModal(false);
    setAddExceptionModalState(addExceptionModalInitialState);
  }, [setShouldShowAddExceptionModal, setAddExceptionModalState]);

  const onAddExceptionCancel = useCallback(() => {
    closeAddExceptionModal();
  }, [closeAddExceptionModal]);

  const onAddExceptionConfirm = useCallback(
    (refetch: inputsModel.Refetch) => (): void => {
      refetch();
      closeAddExceptionModal();
    },
    [closeAddExceptionModal]
  );

  // Callback for creating the AddExceptionModal and allowing it
  // access to the refetchQuery to update the page
  const exceptionModalCallback = useCallback(
    (refetchQuery: inputsModel.Refetch) => {
      if (shouldShowAddExceptionModal) {
        return (
          <AddExceptionModal
            ruleName={addExceptionModalState.ruleName}
            ruleId={addExceptionModalState.ruleId}
            ruleIndices={addExceptionModalState.ruleIndices}
            exceptionListType={addExceptionModalState.exceptionListType}
            alertData={addExceptionModalState.alertData}
            onCancel={onAddExceptionCancel}
            onConfirm={onAddExceptionConfirm(refetchQuery)}
            alertStatus={filterGroup}
          />
        );
      } else {
        return <></>;
      }
    },
    [
      addExceptionModalState,
      filterGroup,
      onAddExceptionCancel,
      onAddExceptionConfirm,
      shouldShowAddExceptionModal,
    ]
  );

  if (loading || indexPatternsLoading || isEmpty(signalsIndex)) {
    return (
      <EuiPanel>
        <HeaderSection title="" />
        <EuiLoadingContent data-test-subj="loading-alerts-panel" />
      </EuiPanel>
    );
  }

  return (
    <>
      <StatefulEventsViewer
        defaultIndices={defaultIndices}
        pageFilters={defaultFiltersMemo}
        defaultModel={alertsDefaultModel}
        end={to}
        headerFilterGroup={headerFilterGroup}
        id={timelineId}
        start={from}
        utilityBar={utilityBarCallback}
        exceptionsModal={exceptionModalCallback}
      />
    </>
  );
};

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getGlobalInputs = inputsSelectors.globalSelector();
  const mapStateToProps = (state: State, ownProps: OwnProps) => {
    const { timelineId } = ownProps;
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
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
