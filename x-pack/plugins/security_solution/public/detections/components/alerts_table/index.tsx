/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiLoadingContent } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { connect, ConnectedProps, useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { Filter, esQuery } from '../../../../../../../src/plugins/data/public';
import { RowRendererId, TimelineIdLiteral } from '../../../../common/types/timeline';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { StatefulEventsViewer } from '../../../common/components/events_viewer';
import { HeaderSection } from '../../../common/components/header_section';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { combineQueries } from '../../../timelines/components/timeline/helpers';
import { useKibana } from '../../../common/lib/kibana';
import { inputsSelectors, State, inputsModel } from '../../../common/store';
import { timelineActions, timelineSelectors } from '../../../timelines/store/timeline';
import { TimelineModel } from '../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { updateAlertStatusAction } from './actions';
import {
  requiredFieldsForActions,
  alertsDefaultModel,
  buildAlertStatusFilter,
  alertsDefaultModelRuleRegistry,
  buildAlertStatusFilterRuleRegistry,
} from './default_config';
import { FILTER_OPEN, AlertsTableFilterGroup } from './alerts_filter_group';
import { AlertsUtilityBar } from './alerts_utility_bar';
import * as i18nCommon from '../../../common/translations';
import * as i18n from './translations';
import {
  SetEventsDeletedProps,
  SetEventsLoadingProps,
  UpdateAlertsStatusCallback,
  UpdateAlertsStatusProps,
} from './types';
import {
  useStateToaster,
  displaySuccessToast,
  displayErrorToast,
} from '../../../common/components/toasters';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { useSourcererScope } from '../../../common/containers/sourcerer';
import { buildTimeRangeFilter } from './helpers';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { columns, RenderCellValue } from '../../configurations/security_solution_detections';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { defaultCellActions } from '../../../common/lib/cell_actions/default_cell_actions';

interface OwnProps {
  defaultFilters?: Filter[];
  from: string;
  hasIndexMaintenance: boolean;
  hasIndexWrite: boolean;
  loading: boolean;
  onRuleChange?: () => void;
  onShowBuildingBlockAlertsChanged: (showBuildingBlockAlerts: boolean) => void;
  onShowOnlyThreatIndicatorAlertsChanged: (showOnlyThreatIndicatorAlerts: boolean) => void;
  showBuildingBlockAlerts: boolean;
  showOnlyThreatIndicatorAlerts: boolean;
  timelineId: TimelineIdLiteral;
  to: string;
}

type AlertsTableComponentProps = OwnProps & PropsFromRedux;

export const AlertsTableComponent: React.FC<AlertsTableComponentProps> = ({
  clearEventsDeleted,
  clearEventsLoading,
  clearSelected,
  defaultFilters,
  from,
  globalFilters,
  globalQuery,
  hasIndexMaintenance,
  hasIndexWrite,
  isSelectAllChecked,
  loading,
  loadingEventIds,
  onRuleChange,
  onShowBuildingBlockAlertsChanged,
  onShowOnlyThreatIndicatorAlertsChanged,
  selectedEventIds,
  setEventsDeleted,
  setEventsLoading,
  showBuildingBlockAlerts,
  showOnlyThreatIndicatorAlerts,
  timelineId,
  to,
}) => {
  const dispatch = useDispatch();
  const [showClearSelectionAction, setShowClearSelectionAction] = useState(false);
  const [filterGroup, setFilterGroup] = useState<Status>(FILTER_OPEN);
  const {
    browserFields,
    indexPattern: indexPatterns,
    loading: indexPatternsLoading,
    selectedPatterns,
  } = useSourcererScope(SourcererScopeName.detections);
  const kibana = useKibana();
  const [, dispatchToaster] = useStateToaster();
  const { addWarning } = useAppToasts();
  // TODO: Once we are past experimental phase this code should be removed
  const ruleRegistryEnabled = useIsExperimentalFeatureEnabled('ruleRegistryEnabled');

  const getGlobalQuery = useCallback(
    (customFilters: Filter[]) => {
      if (browserFields != null && indexPatterns != null) {
        return combineQueries({
          config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
          dataProviders: [],
          indexPattern: indexPatterns,
          browserFields,
          filters: [
            ...(defaultFilters ?? []),
            ...globalFilters,
            ...customFilters,
            ...buildTimeRangeFilter(from, to),
          ],
          kqlQuery: globalQuery,
          kqlMode: globalQuery.language,
          isEventViewer: true,
        });
      }
      return null;
    },
    [browserFields, defaultFilters, globalFilters, globalQuery, indexPatterns, kibana, to, from]
  );

  useInvalidFilterQuery({
    id: timelineId,
    filterQuery: getGlobalQuery([])?.filterQuery,
    kqlError: getGlobalQuery([])?.kqlError,
    query: globalQuery,
    startDate: from,
    endDate: to,
  });

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
    (updated: number, conflicts: number, status: Status) => {
      if (conflicts > 0) {
        // Partial failure
        addWarning({
          title: i18nCommon.UPDATE_ALERT_STATUS_FAILED(conflicts),
          text: i18nCommon.UPDATE_ALERT_STATUS_FAILED_DETAILED(updated, conflicts),
        });
      } else {
        let title: string;
        switch (status) {
          case 'closed':
            title = i18n.CLOSED_ALERT_SUCCESS_TOAST(updated);
            break;
          case 'open':
            title = i18n.OPENED_ALERT_SUCCESS_TOAST(updated);
            break;
          case 'in-progress':
            title = i18n.IN_PROGRESS_ALERT_SUCCESS_TOAST(updated);
        }
        displaySuccessToast(title, dispatchToaster);
      }
    },
    [addWarning, dispatchToaster]
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

  // Catches state change isSelectAllChecked->false upon user selection change to reset utility bar
  useEffect(() => {
    if (isSelectAllChecked) {
      dispatch(
        timelineActions.setTGridSelectAll({
          id: timelineId,
          selectAll: false,
        })
      );
    } else {
      setShowClearSelectionAction(false);
    }
  }, [dispatch, isSelectAllChecked, timelineId]);

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
    dispatch(
      timelineActions.setTGridSelectAll({
        id: timelineId,
        selectAll: false,
      })
    );
    setShowClearSelectionAction(false);
  }, [clearSelected, dispatch, timelineId]);

  // Callback for selecting all events on all pages from utility bar
  // Dispatches to stateful_body's selectAll via TimelineTypeContext props
  // as scope of response data required to actually set selectedEvents
  const selectAllOnAllPagesCallback = useCallback(() => {
    dispatch(
      timelineActions.setTGridSelectAll({
        id: timelineId,
        selectAll: true,
      })
    );
    setShowClearSelectionAction(true);
  }, [dispatch, timelineId]);

  const updateAlertsStatusCallback: UpdateAlertsStatusCallback = useCallback(
    async (
      refetchQuery: inputsModel.Refetch,
      { status, selectedStatus }: UpdateAlertsStatusProps
    ) => {
      // TODO: Once we are past experimental phase this code should be removed
      const currentStatusFilter = ruleRegistryEnabled
        ? buildAlertStatusFilterRuleRegistry(status)
        : buildAlertStatusFilter(status);

      await updateAlertStatusAction({
        query: showClearSelectionAction
          ? getGlobalQuery(currentStatusFilter)?.filterQuery
          : undefined,
        alertIds: Object.keys(selectedEventIds),
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
      ruleRegistryEnabled,
    ]
  );

  // Callback for creating the AlertsUtilityBar which receives totalCount from EventsViewer component
  const utilityBarCallback = useCallback(
    (refetchQuery: inputsModel.Refetch, totalCount: number) => {
      return (
        <AlertsUtilityBar
          areEventsLoading={loadingEventIds.length > 0}
          clearSelection={clearSelectionCallback}
          currentFilter={filterGroup}
          hasIndexMaintenance={hasIndexMaintenance}
          hasIndexWrite={hasIndexWrite}
          onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChanged}
          onShowOnlyThreatIndicatorAlertsChanged={onShowOnlyThreatIndicatorAlertsChanged}
          selectAll={selectAllOnAllPagesCallback}
          selectedEventIds={selectedEventIds}
          showBuildingBlockAlerts={showBuildingBlockAlerts}
          showClearSelection={showClearSelectionAction}
          showOnlyThreatIndicatorAlerts={showOnlyThreatIndicatorAlerts}
          totalCount={totalCount}
          updateAlertsStatus={updateAlertsStatusCallback.bind(null, refetchQuery)}
        />
      );
    },
    [
      clearSelectionCallback,
      filterGroup,
      hasIndexMaintenance,
      hasIndexWrite,
      loadingEventIds.length,
      onShowBuildingBlockAlertsChanged,
      onShowOnlyThreatIndicatorAlertsChanged,
      selectAllOnAllPagesCallback,
      selectedEventIds,
      showBuildingBlockAlerts,
      showClearSelectionAction,
      showOnlyThreatIndicatorAlerts,
      updateAlertsStatusCallback,
    ]
  );

  const defaultFiltersMemo = useMemo(() => {
    // TODO: Once we are past experimental phase this code should be removed
    const alertStatusFilter = ruleRegistryEnabled
      ? buildAlertStatusFilterRuleRegistry(filterGroup)
      : buildAlertStatusFilter(filterGroup);

    if (isEmpty(defaultFilters)) {
      return alertStatusFilter;
    } else if (defaultFilters != null && !isEmpty(defaultFilters)) {
      return [...defaultFilters, ...alertStatusFilter];
    }
  }, [defaultFilters, filterGroup, ruleRegistryEnabled]);
  const { filterManager } = useKibana().services.data.query;

  // TODO: Once we are past experimental phase this code should be removed
  const defaultTimelineModel = ruleRegistryEnabled
    ? alertsDefaultModelRuleRegistry
    : alertsDefaultModel;

  const tGridEnabled = useIsExperimentalFeatureEnabled('tGridEnabled');

  useEffect(() => {
    dispatch(
      timelineActions.initializeTGridSettings({
        defaultColumns: columns.map((c) =>
          !tGridEnabled && c.initialWidth == null
            ? {
                ...c,
                initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
              }
            : c
        ),
        documentType: i18n.ALERTS_DOCUMENT_TYPE,
        excludedRowRendererIds: defaultTimelineModel.excludedRowRendererIds as RowRendererId[],
        filterManager,
        footerText: i18n.TOTAL_COUNT_OF_ALERTS,
        id: timelineId,
        loadingText: i18n.LOADING_ALERTS,
        selectAll: false,
        queryFields: requiredFieldsForActions,
        title: '',
        showCheckboxes: true,
      })
    );
  }, [dispatch, defaultTimelineModel, filterManager, tGridEnabled, timelineId]);

  const headerFilterGroup = useMemo(
    () => <AlertsTableFilterGroup onFilterGroupChanged={onFilterGroupChangedCallback} />,
    [onFilterGroupChangedCallback]
  );

  if (loading || indexPatternsLoading || isEmpty(selectedPatterns)) {
    return (
      <EuiPanel hasBorder>
        <HeaderSection title="" />
        <EuiLoadingContent data-test-subj="loading-alerts-panel" />
      </EuiPanel>
    );
  }

  return (
    <StatefulEventsViewer
      pageFilters={defaultFiltersMemo}
      defaultCellActions={defaultCellActions}
      defaultModel={defaultTimelineModel}
      end={to}
      currentFilter={filterGroup}
      headerFilterGroup={headerFilterGroup}
      id={timelineId}
      onRuleChange={onRuleChange}
      renderCellValue={RenderCellValue}
      rowRenderers={defaultRowRenderers}
      scopeId={SourcererScopeName.detections}
      start={from}
      utilityBar={utilityBarCallback}
    />
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
});

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const AlertsTable = connector(React.memo(AlertsTableComponent));
