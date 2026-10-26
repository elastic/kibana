/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { ObservabilityAlertSearchBar } from '@kbn/observability-plugin/public';
import { EuiFlexItem } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import type { ApmPluginStartDeps } from '../../../plugin';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { push } from '../../shared/links/url_helpers';
import { useAlertsSearchBarContext } from './alerts_search_bar_context';

export function AlertsHeaderSearchBar() {
  const history = useHistory();
  const {
    query: { kuery, rangeFrom, rangeTo },
  } = useAnyOfApmParams('/services/{serviceName}/alerts', '/mobile-services/{serviceName}/alerts');
  const { services } = useKibana<ApmPluginStartDeps>();
  const {
    core: { http, notifications },
  } = useApmPluginContext();

  const {
    triggersActionsUi: { getAlertsSearchBar: AlertsSearchBar },
    data,
    dataViews,
    spaces,
    uiSettings,
  } = services;
  const {
    query: {
      timefilter: { timefilter: timeFilterService },
    },
  } = data;

  const useToasts = () => notifications!.toasts;

  const { apmFilters, filterControls, setFilterControls, setEsQuery, onKueryChange } =
    useAlertsSearchBarContext();

  return (
    <EuiFlexItem grow={false}>
      <ObservabilityAlertSearchBar
        appName="apmApp"
        kuery={kuery}
        onRangeFromChange={(value) => push(history, { query: { rangeFrom: value } })}
        onRangeToChange={(value) => push(history, { query: { rangeTo: value } })}
        onKueryChange={onKueryChange}
        defaultFilters={apmFilters}
        filterControls={filterControls}
        onFilterControlsChange={setFilterControls}
        onEsQueryChange={setEsQuery}
        rangeTo={rangeTo}
        rangeFrom={rangeFrom}
        disableLocalStorageSync
        services={{
          timeFilterService,
          AlertsSearchBar,
          http,
          data,
          dataViews,
          notifications,
          spaces,
          useToasts,
          uiSettings,
        }}
      />
    </EuiFlexItem>
  );
}
