/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { TLSParams } from '../../../../../common/runtime_types/alerts/tls';
import { store } from '../../../state';
import { ClientPluginsStart } from '../../../../plugin';
import { AlertTls } from '../../../components/overview/alerts/alerts_containers/alert_tls';
import { kibanaService } from '../../../state/kibana_service';
import { UptimeDataViewContextProvider } from '../../../contexts/uptime_data_view_context';

interface Props {
  id?: string;
  stackVersion?: string;
  core: CoreStart;
  plugins: ClientPluginsStart;
  ruleParams: RuleTypeParamsExpressionProps<TLSParams>['ruleParams'];
  setRuleParams: RuleTypeParamsExpressionProps<TLSParams>['setRuleParams'];
}

// eslint-disable-next-line import/no-default-export
export default function TLSAlert({
  id,
  stackVersion,
  core,
  plugins,
  ruleParams,
  setRuleParams,
}: Props) {
  kibanaService.core = core;
  return (
    <ReduxProvider store={store}>
      <KibanaContextProvider services={{ ...core, ...plugins }}>
        <UptimeDataViewContextProvider dataViews={plugins.dataViews}>
          <AlertTls
            id={id}
            stackVersion={stackVersion}
            ruleParams={ruleParams}
            setRuleParams={setRuleParams}
          />
        </UptimeDataViewContextProvider>
      </KibanaContextProvider>
    </ReduxProvider>
  );
}
