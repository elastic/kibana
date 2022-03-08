/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { Meta, Story } from '@storybook/react';
import React from 'react';
import { CoreStart } from '../../../../../../../src/core/public';
import { createKibanaReactContext } from '../../../../../../../src/plugins/kibana_react/public';
import {
  APIReturnType,
  createCallApmApi,
} from '../../../services/rest/create_call_apm_api';
import { ServiceIcons } from './';

type ServiceDetailsReturnType =
  APIReturnType<'GET /internal/apm/services/{serviceName}/metadata/details'>;
type ServiceIconsReturnType =
  APIReturnType<'GET /internal/apm/services/{serviceName}/metadata/icons'>;

interface Args {
  serviceName: string;
  start: string;
  end: string;
  icons: ServiceIconsReturnType;
  details: ServiceDetailsReturnType;
}

const stories: Meta<Args> = {
  title: 'shared/ServiceIcons',
  component: ServiceIcons,
  decorators: [
    (StoryComponent, { args }) => {
      const { icons, details, serviceName } = args;

      const coreMock = {
        http: {
          get: (endpoint: string) => {
            switch (endpoint) {
              case `/internal/apm/services/${serviceName}/metadata/icons`:
                return icons;
              default:
                return details;
            }
          },
        },
        notifications: { toasts: { add: () => {} } },
        uiSettings: { get: () => true },
      } as unknown as CoreStart;

      const KibanaReactContext = createKibanaReactContext(coreMock);

      createCallApmApi(coreMock);

      return (
        <KibanaReactContext.Provider>
          <StoryComponent />
        </KibanaReactContext.Provider>
      );
    },
  ],
};
export default stories;

export const Example: Story<Args> = ({ serviceName, start, end }) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTitle size="l">
          <h1 data-test-subj="apmMainTemplateHeaderServiceName">
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="l">
                      <h1 data-test-subj="apmMainTemplateHeaderServiceName">
                        {serviceName}
                      </h1>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <ServiceIcons
                      serviceName={serviceName}
                      start={start}
                      end={end}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </h1>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
Example.args = {
  serviceName: 'opbeans-java',
  start: '2021-09-10T13:59:00.000Z',
  end: '2021-09-10T14:14:04.789Z',
  icons: {
    agentName: 'java',
    containerType: 'Kubernetes',
    cloudProvider: 'gcp',
  },
  details: {
    service: {
      versions: ['2021-12-22 17:03:27'],
      runtime: { name: 'Java', version: '11.0.11' },
      agent: {
        name: 'java',
        version: '1.28.3-SNAPSHOT.UNKNOWN',
      },
    },
    container: {
      os: 'Linux',
      type: 'Kubernetes',
      isContainerized: true,
      totalNumberInstances: 1,
    },
    cloud: {
      provider: 'gcp',
      projectName: 'elastic-observability',
      availabilityZones: ['us-central1-c'],
      machineTypes: ['n1-standard-4'],
    },
  },
};
