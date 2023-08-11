/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CoreStart } from '@kbn/core/public';
import { ObservabilityPublicPluginsStart } from '../../plugin';
import { AlertsPage } from './alerts';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import * as pluginContext from '../../hooks/use_plugin_context';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { AppMountParameters } from '@kbn/core/public';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));
jest.mock('@kbn/observability-shared-plugin/public');
jest.mock('@kbn/triggers-actions-ui-plugin/public', () => ({
  useLoadRuleTypes: jest.fn(),
}));
jest.spyOn(pluginContext, 'usePluginContext').mockImplementation(() => ({
  appMountParameters: {} as AppMountParameters,
  config: {
    unsafe: {
      slo: { enabled: false },
      alertDetails: {
        apm: { enabled: false },
        logs: { enabled: false },
        metrics: { enabled: false },
        uptime: { enabled: false },
        observability: { enabled: false },
      },
      thresholdRule: { enabled: false },
    },
    compositeSlo: {
      enabled: false,
    },
    aiAssistant: {
      enabled: false,
      feedback: {
        enabled: false,
      },
    },
  },
  observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
  ObservabilityPageTemplate: KibanaPageTemplate,
  kibanaFeatures: [],
  core: {} as CoreStart,
  plugins: {} as ObservabilityPublicPluginsStart,
}));

describe('AlertsPage with all capabilities', () => {
  async function setup() {
    return render(<AlertsPage />);
  }

  it('should render an alerts page template', async () => {
    const wrapper = await setup();
    expect(wrapper.getByTestId('alertsPage')).toBeInTheDocument();
  });
});
