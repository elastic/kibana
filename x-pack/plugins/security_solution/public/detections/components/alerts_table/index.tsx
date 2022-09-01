/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo } from 'react';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import type { Filter } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import type { RowRendererId, TimelineIdLiteral } from '../../../../common/types/timeline';
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
import { combineQueries } from '../../../timelines/components/timeline/helpers';
import { timelineActions, timelineSelectors } from '../../../timelines/store/timeline';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import type { TimelineModel } from '../../../timelines/store/timeline/model';
import { columns, RenderCellValue } from '../../configurations/security_solution_detections';
import { AdditionalFiltersAction } from './additional_filters_action';
import {
  alertsDefaultModel,
  buildAlertStatusFilter,
  requiredFieldsForActions,
} from './default_config';
import { buildTimeRangeFilter } from './helpers';
import * as i18n from './translations';
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
  timelineId,
  to,
  filterGroup = 'open',
}) => {
  const dispatch = useDispatch();
  const {
    browserFields,
    indexPattern: indexPatterns,
    selectedPatterns,
  } = useSourcererDataView(SourcererScopeName.detections);
  const kibana = useKibana();
  const ACTION_BUTTON_COUNT = 5;

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
    id: timelineId,
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
        timelineActions.setTGridSelectAll({
          id: timelineId,
          selectAll: false,
        })
      );
    }
  }, [dispatch, isSelectAllChecked, timelineId]);

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
    const alertStatusFilter = buildAlertStatusFilter(filterGroup);

    if (isEmpty(defaultFilters)) {
      return alertStatusFilter;
    } else if (defaultFilters != null && !isEmpty(defaultFilters)) {
      return [...defaultFilters, ...alertStatusFilter];
    }
  }, [defaultFilters, filterGroup]);
  const { filterManager } = useKibana().services.data.query;

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
        excludedRowRendererIds: alertsDefaultModel.excludedRowRendererIds as RowRendererId[],
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
  }, [dispatch, filterManager, tGridEnabled, timelineId]);

  const leadingControlColumns = useMemo(() => getDefaultControlColumn(ACTION_BUTTON_COUNT), []);

  if (loading || isEmpty(selectedPatterns)) {
    return null;
  }

  return (
    <StatefulEventsViewer
      additionalFilters={additionalFiltersComponent}
      currentFilter={filterGroup}
      defaultCellActions={defaultCellActions}
      defaultModel={alertsDefaultModel}
      end={to}
      entityType="events"
      hasAlertsCrud={hasIndexWrite && hasIndexMaintenance}
      id={timelineId}
      leadingControlColumns={leadingControlColumns}
      onRuleChange={onRuleChange}
      pageFilters={defaultFiltersMemo}
      renderCellValue={RenderCellValue}
      rowRenderers={defaultRowRenderers}
      scopeId={SourcererScopeName.detections}
      start={from}
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

const connector = connect(makeMapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const AlertsTable = connector(React.memo(AlertsTableComponent));
