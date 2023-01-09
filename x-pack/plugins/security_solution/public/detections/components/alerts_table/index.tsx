/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo } from 'react';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch, useSelector } from 'react-redux';
import type { Filter } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { combineQueries } from '../../../common/lib/kuery';
import type { AlertWorkflowStatus } from '../../../common/types';
import type { TableIdLiteral } from '../../../../common/types';
import { tableDefaults } from '../../../common/store/data_table/defaults';
import { dataTableActions, dataTableSelectors } from '../../../common/store/data_table';
import type { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { eventsViewerSelector } from '../../../common/components/events_viewer/selectors';
import { StatefulEventsViewer } from '../../../common/components/events_viewer';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import { defaultCellActions } from '../../../common/lib/cell_actions/default_cell_actions';
import { useKibana } from '../../../common/lib/kibana';
import type { inputsModel, State } from '../../../common/store';
import { inputsSelectors } from '../../../common/store';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { getColumns, RenderCellValue } from '../../configurations/security_solution_detections';
import { AdditionalFiltersAction } from './additional_filters_action';
import {
  getAlertsDefaultModel,
  buildAlertStatusFilter,
  requiredFieldsForActions,
} from './default_config';
import { buildTimeRangeFilter } from './helpers';
import * as i18n from './translations';
import { useLicense } from '../../../common/hooks/use_license';
import { useBulkAddToCaseActions } from './timeline_actions/use_bulk_add_to_case_actions';
import { useAddBulkToTimelineAction } from './timeline_actions/use_add_bulk_to_timeline';

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
  tableId: TableIdLiteral;
  to: string;
  filterGroup?: Status;
}

type AlertsTableComponentProps = OwnProps & PropsFromRedux;

export const AlertsTableComponent: React.FC<AlertsTableComponentProps> = ({
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
  showBuildingBlockAlerts,
  showOnlyThreatIndicatorAlerts,
  tableId,
  to,
  filterGroup,
}) => {
  const dispatch = useDispatch();

  const { globalQueries } = useSelector((state: State) => eventsViewerSelector(state, tableId));

  const {
    browserFields,
    indexPattern: indexPatterns,
    selectedPatterns,
  } = useSourcererDataView(SourcererScopeName.detections);
  const kibana = useKibana();
  const license = useLicense();
  const isEnterprisePlus = useLicense().isEnterprise();
  const ACTION_BUTTON_COUNT = isEnterprisePlus ? 5 : 4;

  const getGlobalQuery = useCallback(
    (customFilters: Filter[]) => {
      if (browserFields != null && indexPatterns != null) {
        return combineQueries({
          config: getEsQueryConfig(kibana.services.uiSettings),
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
        });
      }
      return null;
    },
    [browserFields, defaultFilters, globalFilters, globalQuery, indexPatterns, kibana, to, from]
  );

  useInvalidFilterQuery({
    id: tableId,
    filterQuery: getGlobalQuery([])?.filterQuery,
    kqlError: getGlobalQuery([])?.kqlError,
    query: globalQuery,
    startDate: from,
    endDate: to,
  });

  // Catches state change isSelectAllChecked->false upon user selection change to reset utility bar
  useEffect(() => {
    if (isSelectAllChecked) {
      dispatch(
        dataTableActions.setDataTableSelectAll({
          id: tableId,
          selectAll: false,
        })
      );
    }
  }, [dispatch, isSelectAllChecked, tableId]);

  const additionalFiltersComponent = useMemo(
    () => (
      <AdditionalFiltersAction
        areEventsLoading={loadingEventIds.length > 0}
        onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChanged}
        showBuildingBlockAlerts={showBuildingBlockAlerts}
        onShowOnlyThreatIndicatorAlertsChanged={onShowOnlyThreatIndicatorAlertsChanged}
        showOnlyThreatIndicatorAlerts={showOnlyThreatIndicatorAlerts}
      />
    ),
    [
      loadingEventIds.length,
      onShowBuildingBlockAlertsChanged,
      onShowOnlyThreatIndicatorAlertsChanged,
      showBuildingBlockAlerts,
      showOnlyThreatIndicatorAlerts,
    ]
  );

  const defaultFiltersMemo = useMemo(() => {
    let alertStatusFilter: Filter[] = [];
    if (filterGroup) {
      alertStatusFilter = buildAlertStatusFilter(filterGroup);
    }
    if (isEmpty(defaultFilters)) {
      return alertStatusFilter;
    } else if (defaultFilters != null && !isEmpty(defaultFilters)) {
      return [...defaultFilters, ...alertStatusFilter];
    }
  }, [defaultFilters, filterGroup]);

  const { filterManager } = kibana.services.data.query;

  const tGridEnabled = useIsExperimentalFeatureEnabled('tGridEnabled');

  useEffect(() => {
    dispatch(
      dataTableActions.initializeDataTableSettings({
        defaultColumns: getColumns(license).map((c) =>
          !tGridEnabled && c.initialWidth == null
            ? {
                ...c,
                initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
              }
            : c
        ),
        id: tableId,
        loadingText: i18n.LOADING_ALERTS,
        queryFields: requiredFieldsForActions,
        title: i18n.ALERTS_DOCUMENT_TYPE,
        showCheckboxes: true,
      })
    );
  }, [dispatch, filterManager, tGridEnabled, tableId, license]);

  const leadingControlColumns = useMemo(
    () => getDefaultControlColumn(ACTION_BUTTON_COUNT),
    [ACTION_BUTTON_COUNT]
  );

  const refetchQuery = useCallback((newQueries: inputsModel.GlobalQuery[]) => {
    newQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
  }, []);

  const addToCaseBulkActions = useBulkAddToCaseActions();
  const addBulkToTimelineAction = useAddBulkToTimelineAction({
    localFilters: defaultFiltersMemo ?? [],
    tableId,
    from,
    to,
    scopeId: SourcererScopeName.detections,
  });

  const bulkActions = useMemo(
    () => ({
      onAlertStatusActionSuccess: () => {
        refetchQuery(globalQueries);
      },
      customBulkActions: [...addToCaseBulkActions, addBulkToTimelineAction],
    }),
    [globalQueries, refetchQuery, addToCaseBulkActions, addBulkToTimelineAction]
  );

  if (loading || isEmpty(selectedPatterns)) {
    return null;
  }

  return (
    <StatefulEventsViewer
      additionalFilters={additionalFiltersComponent}
      currentFilter={filterGroup as AlertWorkflowStatus}
      defaultCellActions={defaultCellActions}
      defaultModel={getAlertsDefaultModel(license)}
      end={to}
      bulkActions={bulkActions}
      hasCrudPermissions={hasIndexWrite && hasIndexMaintenance}
      tableId={tableId}
      leadingControlColumns={leadingControlColumns}
      onRuleChange={onRuleChange}
      pageFilters={defaultFiltersMemo}
      renderCellValue={RenderCellValue}
      rowRenderers={defaultRowRenderers}
      sourcererScope={SourcererScopeName.detections}
      start={from}
    />
  );
};

const makeMapStateToProps = () => {
  const getDataTable = dataTableSelectors.getTableByIdSelector();
  const getGlobalInputs = inputsSelectors.globalSelector();
  const mapStateToProps = (state: State, ownProps: OwnProps) => {
    const { tableId } = ownProps;
    const table = getDataTable(state, tableId) ?? tableDefaults;
    const { isSelectAllChecked, loadingEventIds } = table;

    const globalInputs: inputsModel.InputsRange = getGlobalInputs(state);
    const { query, filters } = globalInputs;
    return {
      globalQuery: query,
      globalFilters: filters,
      isSelectAllChecked,
      loadingEventIds,
    };
  };
  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const AlertsTable = connector(React.memo(AlertsTableComponent));
