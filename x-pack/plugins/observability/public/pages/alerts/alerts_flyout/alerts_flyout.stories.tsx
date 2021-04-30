/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';
import { PluginContext, PluginContextValue } from '../../../context/plugin_context';
import { TopAlert } from '../';
import { AlertsFlyout } from './';

interface Args {
  alert: TopAlert;
}

export default {
  title: 'app/Alerts/AlertsFlyout',
  component: AlertsFlyout,
  decorators: [
    (Story: ComponentType) => {
      return (
        <KibanaContextProvider
          services={{
            docLinks: { links: { query: {} } },
            storage: { get: () => {} },
            uiSettings: {
              get: (setting: string) => {
                if (setting === 'dateFormat') {
                  return 'MMM D, YYYY @ HH:mm:ss.SSS';
                }
              },
            },
          }}
        >
          {' '}
          <PluginContext.Provider
            value={
              ({
                core: {
                  http: { basePath: { prepend: (_: string) => '' } },
                },
              } as unknown) as PluginContextValue
            }
          >
            <Story />
          </PluginContext.Provider>
        </KibanaContextProvider>
        //
      );
    },
  ],
};

export function Example({ alert }: Args) {
  return <AlertsFlyout alert={alert} onClose={() => {}} />;
}
Example.args = {
  alert: {
    link: '/app/apm/services/opbeans-java?rangeFrom=now-15m&rangeTo=now',
    reason: 'Error count for opbeans-java was above the threshold',
    active: true,
    start: 1618235449493,
    fields: {
      'rule.id': 'apm.error_rate',
      'service.environment': ['production'],
      'service.name': ['opbeans-java'],
      'rule.name': 'Error count threshold | opbeans-java (smith test)',
      'kibana.rac.alert.duration.us': 61787000,
      'kibana.rac.alert.evaluation.threshold': 0,
      'kibana.rac.alert.status': 'open',
      tags: ['apm', 'service.name:opbeans-java'],
      'kibana.rac.alert.uuid': 'c50fbc70-0d77-462d-ac0a-f2bd0b8512e4',
      'rule.uuid': '474920d0-93e9-11eb-ac86-0b455460de81',
      'event.action': 'active',
      '@timestamp': '2021-04-14T21:43:42.966Z',
      'kibana.rac.alert.id': 'apm.error_rate_opbeans-java_production',
      'processor.event': ['error'],
      'kibana.rac.alert.start': '2021-04-14T21:42:41.179Z',
      'kibana.rac.producer': 'apm',
      'event.kind': 'state',
      'rule.category': 'Error count threshold',
      'kibana.rac.alert.evaluation.value': 1,
    },
  },
} as Args;
