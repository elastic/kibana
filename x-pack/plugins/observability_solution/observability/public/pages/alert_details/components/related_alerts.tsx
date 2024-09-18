/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import { ALERT_END, ALERT_START } from '@kbn/rule-data-utils';
import { BoolQuery, Filter } from '@kbn/es-query';
import { AlertsGrouping } from '@kbn/alerts-grouping';

import { observabilityAlertFeatureIds } from '../../../../common/constants';
import { TopAlert } from '../../..';
import {
  AlertSearchBarContainerState,
  defaultState as DEFAULT_STATE,
} from '../../../components/alert_search_bar/containers/state_container';
import type { Group } from '../../../../common/typings';
import { ObservabilityAlertSearchbarWithUrlSync } from '../../../components/alert_search_bar/alert_search_bar_with_url_sync';
import { renderGroupPanel } from '../../../components/alerts_table/grouping/render_group_panel';
import { getGroupStats } from '../../../components/alerts_table/grouping/get_group_stats';
import { getAggregationsByGroupingField } from '../../../components/alerts_table/grouping/get_aggregations_by_grouping_field';
import { DEFAULT_GROUPING_OPTIONS } from '../../../components/alerts_table/grouping/constants';
import { ALERT_STATUS_FILTER } from '../../../components/alert_search_bar/constants';
import { AlertsByGroupingAgg } from '../../../components/alerts_table/types';
import {
  alertSearchBarStateContainer,
  Provider,
  useAlertSearchBarStateContainer,
} from '../../../components/alert_search_bar/containers';
import { ALERTS_PAGE_ALERTS_TABLE_CONFIG_ID, SEARCH_BAR_URL_STORAGE_KEY } from '../../../constants';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useKibana } from '../../../utils/kibana_react';
import { buildEsQuery } from '../../../utils/build_es_query';
import { mergeBoolQueries } from '../../alerts/helpers/merge_bool_queries';
import { getGroupQueries } from '../helpers/get_related_alerts_query';

const ALERTS_SEARCH_BAR_ID = 'alerts-search-bar-o11y';
const ALERTS_PER_PAGE = 50;
const ALERTS_TABLE_ID = 'xpack.observability.alerts.alert.table';

interface Props {
  alert?: TopAlert;
  groups?: Group[];
  tags?: string[];
}

const defaultState: AlertSearchBarContainerState = { ...DEFAULT_STATE, status: 'active' };
const DEFAULT_FILTERS: Filter[] = [];

export function InternalRelatedAlerts({ alert, groups, tags }: Props) {
  const kibanaServices = useKibana().services;
  const {
    http,
    notifications,
    dataViews,
    triggersActionsUi: { alertsTableConfigurationRegistry, getAlertsStateTable: AlertsStateTable },
  } = kibanaServices;
  const { observabilityRuleTypeRegistry } = usePluginContext();
  const alertSearchBarStateProps = useAlertSearchBarStateContainer(SEARCH_BAR_URL_STORAGE_KEY, {
    replace: false,
  });

  const [esQuery, setEsQuery] = useState<{ bool: BoolQuery }>();
  const relatedAlertQuery = useRef(getGroupQueries(tags, groups));
  const alertStart = alert?.fields[ALERT_START];
  const alertEnd = alert?.fields[ALERT_END];

  useEffect(() => {
    if (alertStart) {
      const defaultTimeRange = getPaddedAlertTimeRange(alertStart, alertEnd);
      alertSearchBarStateProps.onRangeFromChange(defaultTimeRange.from);
      alertSearchBarStateProps.onRangeToChange(defaultTimeRange.to);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertStart, alertEnd]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiSpacer size="l" />
        <ObservabilityAlertSearchbarWithUrlSync
          appName={ALERTS_SEARCH_BAR_ID}
          onEsQueryChange={setEsQuery}
          urlStorageKey={SEARCH_BAR_URL_STORAGE_KEY}
          defaultSearchQueries={relatedAlertQuery.current}
          defaultState={{
            ...defaultState,
            kuery: getGroupQueries(tags, groups)?.[0].query ?? '',
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {esQuery && (
          <AlertsGrouping<AlertsByGroupingAgg>
            featureIds={observabilityAlertFeatureIds}
            defaultFilters={ALERT_STATUS_FILTER[alertSearchBarStateProps.status] ?? DEFAULT_FILTERS}
            from={alertSearchBarStateProps.rangeFrom}
            to={alertSearchBarStateProps.rangeTo}
            globalFilters={alertSearchBarStateProps.filters ?? DEFAULT_FILTERS}
            globalQuery={{ query: alertSearchBarStateProps.kuery, language: 'kuery' }}
            groupingId={ALERTS_PAGE_ALERTS_TABLE_CONFIG_ID}
            defaultGroupingOptions={DEFAULT_GROUPING_OPTIONS}
            getAggregationsByGroupingField={getAggregationsByGroupingField}
            renderGroupPanel={renderGroupPanel}
            getGroupStats={getGroupStats}
            services={{
              notifications,
              dataViews,
              http,
            }}
          >
            {(groupingFilters) => {
              const groupQuery = buildEsQuery({
                filters: groupingFilters,
              });
              return (
                <AlertsStateTable
                  id={ALERTS_TABLE_ID}
                  featureIds={observabilityAlertFeatureIds}
                  configurationId={ALERTS_PAGE_ALERTS_TABLE_CONFIG_ID}
                  query={mergeBoolQueries(esQuery, groupQuery)}
                  showAlertStatusWithFlapping
                  initialPageSize={ALERTS_PER_PAGE}
                  cellContext={{ observabilityRuleTypeRegistry }}
                  alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
                />
              );
            }}
          </AlertsGrouping>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function RelatedAlerts(props: Props) {
  return (
    <Provider value={alertSearchBarStateContainer}>
      <InternalRelatedAlerts {...props} />
    </Provider>
  );
}
