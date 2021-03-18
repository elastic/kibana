/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { mountWithIntl, renderWithIntl } from '@kbn/test/jest';
import { findTestSubject, takeMountedSnapshot } from '@elastic/eui/lib/test';
import { httpServiceMock } from 'src/core/public/mocks';

import { AppContextProvider } from '../../../app_context';
import { Cluster } from '../../../../../common/lib';
import { RemoteClusterForm } from './remote_cluster_form';

// Make sure we have deterministic aria IDs.
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: (prefix = 'staticGenerator') => (suffix = 'staticId') => `${prefix}_${suffix}`,
}));

const saveCluster = (component: ReactWrapper) =>
  findTestSubject(component, 'remoteClusterFormSaveButton').simulate('click');

describe('RemoteClusterForm', () => {
  describe('not on cloud', () => {
    test(`renders untouched state`, () => {
      const component = renderWithIntl(<RemoteClusterForm save={() => {}} />);
      expect(component).toMatchSnapshot();
    });

    describe('proxy mode', () => {
      test('renders correct connection settings when user enables proxy mode', () => {
        const component = mountWithIntl(<RemoteClusterForm save={() => {}} />);

        findTestSubject(component, 'remoteClusterFormConnectionModeToggle').simulate('click');

        expect(component).toMatchSnapshot();
      });
    });

    describe('validation', () => {
      test('renders invalid state and a global form error when the user tries to submit an invalid form', () => {
        const component = mountWithIntl(<RemoteClusterForm save={() => {}} />);

        saveCluster(component);

        const fieldsSnapshot = [
          'remoteClusterFormNameFormRow',
          'remoteClusterFormSeedNodesFormRow',
          'remoteClusterFormSkipUnavailableFormRow',
          'remoteClusterFormGlobalError',
        ].map((testSubject) => {
          const mountedField = findTestSubject(component, testSubject);
          return takeMountedSnapshot(mountedField as ReactWrapper);
        });

        expect(fieldsSnapshot).toMatchSnapshot();
      });
    });
  });

  describe('on cloud', () => {
    const basePathMock = {
      ...httpServiceMock.createBasePath(),
      prepend: (url: string) => 'mocked-url',
    };
    const ComponentWithContext = ({ cluster }: { cluster?: Cluster }) => (
      <AppContextProvider context={{ isCloudEnabled: true, basePath: basePathMock }}>
        <RemoteClusterForm save={() => {}} cluster={cluster} />
      </AppContextProvider>
    );

    describe('cloud url input', () => {
      test('new cluster defaults to cloud url input', () => {
        const component = mountWithIntl(<ComponentWithContext />);
        const cloudUrlSwitch = findTestSubject(component, 'remoteClusterFormCloudUrlToggle');

        expect(cloudUrlSwitch.exists()).toBeTruthy();
      });

      test('existing cluster that defaults to cloud url', () => {
        const cluster: Cluster = {
          name: 'test-cluster',
          mode: 'proxy',
          proxyAddress: 'cloud-url:9400',
          serverName: 'cloud-url',
        };
        const component = mountWithIntl(<ComponentWithContext cluster={cluster} />);
        const cloudUrlInput = findTestSubject(component, 'remoteClusterFormCloudUrlInput');

        expect(cloudUrlInput.exists()).toBeTruthy();
        expect(cloudUrlInput.props().value).toBe('cloud-url');
      });

      test('existing cluster that defaults to manual input (non-default port)', () => {
        const cluster: Cluster = {
          name: 'test-cluster',
          mode: 'proxy',
          proxyAddress: 'cloud-url:9500',
          serverName: 'cloud-url',
        };
        const component = mountWithIntl(<ComponentWithContext cluster={cluster} />);
        const cloudUrlInput = findTestSubject(component, 'remoteClusterFormCloudUrlInput');

        expect(cloudUrlInput.exists()).toBeFalsy();
      });

      test('existing cluster that defaults to manual input (proxy address is different from server name)', () => {
        const cluster: Cluster = {
          name: 'test-cluster',
          mode: 'proxy',
          proxyAddress: 'cloud-url:9400',
          serverName: 'another-value',
        };
        const component = mountWithIntl(<ComponentWithContext cluster={cluster} />);
        const cloudUrlInput = findTestSubject(component, 'remoteClusterFormCloudUrlInput');

        expect(cloudUrlInput.exists()).toBeFalsy();
      });
    });

    describe('validation', () => {
      test('cloud url is mandatory when cloud url input is enabled', () => {
        const component = mountWithIntl(<ComponentWithContext />);
        findTestSubject(component, 'remoteClusterFormNameInput').simulate('change', {
          currentTarget: { value: 'cluster-name' },
        });
        saveCluster(component);

        const cloudUrlFormRow = findTestSubject(component, 'remoteClusterFormCloudUrlFormRow');
        expect(cloudUrlFormRow.text()).toContain('A url is required');
      });

      test('proxy address and server name are required when cloud url input is disabled', () => {
        const component = mountWithIntl(<ComponentWithContext />);
        findTestSubject(component, 'remoteClusterFormNameInput').simulate('change', {
          currentTarget: { value: 'cluster-name' },
        });
        findTestSubject(component, 'remoteClusterFormCloudUrlToggle').simulate('click');
        saveCluster(component);

        const cloudUrlFormRow = findTestSubject(component, 'remoteClusterFormCloudUrlFormRow');
        expect(cloudUrlFormRow.exists()).toBeFalsy();

        const proxyAddressFormRow = findTestSubject(
          component,
          'remoteClusterFormProxyAddressFormRow'
        );
        const serverNameFormRow = findTestSubject(component, 'remoteClusterFormServerNameFormRow');

        expect(proxyAddressFormRow.text()).toContain('A proxy address is required.');
        expect(serverNameFormRow.text()).toContain('A server name is required.');
      });
    });
  });
});
