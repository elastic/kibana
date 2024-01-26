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
import { TLSRuleComponent } from '../../../components/alerts/tls_rule_ui';
import { ClientPluginsStart } from '../../../../../plugin';
import { TLSParams } from '../../../../../../common/runtime_types/alerts/tls';
import { kibanaService } from '../../../../../utils/kibana_service';
import { store } from '../../../state';

interface Props {
  core: CoreStart;
  plugins: ClientPluginsStart;
  ruleParams: RuleTypeParamsExpressionProps<TLSParams>['ruleParams'];
  setRuleParams: RuleTypeParamsExpressionProps<TLSParams>['setRuleParams'];
}

// eslint-disable-next-line import/no-default-export
export default function TLSAlert({ core, plugins, ruleParams, setRuleParams }: Props) {
  kibanaService.core = core;
  return (
    <ReduxProvider store={store}>
      <KibanaContextProvider services={{ ...core, ...plugins }}>
        <TLSRuleComponent ruleParams={ruleParams} setRuleParams={setRuleParams} />
      </KibanaContextProvider>
    </ReduxProvider>
  );
}
