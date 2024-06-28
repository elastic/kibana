/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { kibanaService } from '../../../../../utils/kibana_service';
import { ClientPluginsStart } from '../../../../../plugin';
import { store } from '../../../state';
import { StatusRuleParams } from '../../../../../../common/rules/status_rule';

interface Props {
  core: CoreStart;
  plugins: ClientPluginsStart;
  params: RuleTypeParamsExpressionProps<StatusRuleParams>;
}

// eslint-disable-next-line import/no-default-export
export default function MonitorStatusAlert({ core, plugins, params }: Props) {
  kibanaService.core = core;
  const queryClient = new QueryClient();
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <KibanaContextProvider services={{ ...core, ...plugins }}>
          <EuiText>
            <FormattedMessage
              id="xpack.synthetics.alertRule.monitorStatus.description"
              defaultMessage="Manage synthetics monitor status rule actions."
            />
          </EuiText>

          <EuiSpacer size="m" />
        </KibanaContextProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
}
