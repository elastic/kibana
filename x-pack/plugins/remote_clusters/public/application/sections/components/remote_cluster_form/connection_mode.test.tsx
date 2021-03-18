/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl, renderWithIntl } from '@kbn/test/jest';
import { httpServiceMock } from 'src/core/public/mocks';

import { AppContextProvider } from '../../../app_context';
import { FormFields } from './remote_cluster_form';
import { ConnectionMode } from './connection_mode';
import { ClusterErrors } from './validators';

const cluster = {
  name: '',
  seeds: [],
  skipUnavailable: false,
  nodeConnections: 3,
  proxyAddress: '',
  proxySocketConnections: 18,
  serverName: '',
};

const basePathMock = {
  ...httpServiceMock.createBasePath(),
  prepend: (url: string) => 'mocked-url',
};

describe('ConnectionMode', () => {
  describe('not on cloud', () => {
    test('renders a switch for sniff and proxy modes', () => {
      const component = mountWithIntl(
        <ConnectionMode
          fields={{ ...cluster, cloudUrl: '', isCloudUrl: false }}
          onFieldsChange={(changedFields: Partial<FormFields>) => {}}
          fieldsErrors={{}}
          areErrorsVisible={false}
        />
      );

      const modeSwitch = findTestSubject(component, 'remoteClusterFormConnectionModeToggle');
      expect(modeSwitch.exists()).toBeTruthy();
    });

    test('renders no switch for cloud and manual modes', () => {
      const component = mountWithIntl(
        <ConnectionMode
          fields={{ ...cluster, cloudUrl: '', isCloudUrl: false }}
          onFieldsChange={(changedFields: Partial<FormFields>) => {}}
          fieldsErrors={{}}
          areErrorsVisible={false}
        />
      );

      const cloudUrlSwitch = findTestSubject(component, 'remoteClusterFormCloudUrlToggle');
      expect(cloudUrlSwitch.exists()).toBeFalsy();
    });

    describe('sniff mode', () => {
      const fields: FormFields = { ...cluster, mode: 'sniff', cloudUrl: '', isCloudUrl: false };
      test('renders cluster without errors', () => {
        const component = renderWithIntl(
          <ConnectionMode
            fields={fields}
            onFieldsChange={(changedFields: Partial<FormFields>) => {}}
            fieldsErrors={{}}
            areErrorsVisible={false}
          />
        );

        expect(component).toMatchSnapshot();
      });

      test('renders cluster with errors', () => {
        const component = renderWithIntl(
          <ConnectionMode
            fields={fields}
            onFieldsChange={(changedFields: Partial<FormFields>) => {}}
            fieldsErrors={{ seeds: <span>some error</span> }}
            areErrorsVisible={true}
          />
        );

        expect(component).toMatchSnapshot();
      });
    });
    describe('proxy mode', () => {
      const fields: FormFields = { ...cluster, mode: 'proxy', cloudUrl: '', isCloudUrl: false };
      test('renders cluster without errors', () => {
        const component = renderWithIntl(
          <ConnectionMode
            fields={fields}
            onFieldsChange={(changedFields: Partial<FormFields>) => {}}
            fieldsErrors={{}}
            areErrorsVisible={false}
          />
        );

        expect(component).toMatchSnapshot();
      });

      test('renders cluster with errors', () => {
        const component = renderWithIntl(
          <ConnectionMode
            fields={fields}
            onFieldsChange={(changedFields: Partial<FormFields>) => {}}
            fieldsErrors={{
              proxyAddress: <span>some error</span>,
              serverName: <span>some error</span>,
            }}
            areErrorsVisible={true}
          />
        );

        expect(component).toMatchSnapshot();
      });

      test('server name is optional', () => {
        const component = mountWithIntl(
          <ConnectionMode
            fields={fields}
            onFieldsChange={(changedFields: Partial<FormFields>) => {}}
            fieldsErrors={{}}
            areErrorsVisible={false}
          />
        );

        const serverNameFormRow = findTestSubject(component, 'remoteClusterFormServerNameFormRow');
        expect(serverNameFormRow.find('label').text()).toBe('Server name (optional)');
      });
    });
  });

  describe('on cloud', () => {
    const formFields: FormFields = { ...cluster, cloudUrl: '', isCloudUrl: false };
    const ComponentWithContext = ({
      fields,
      fieldsErrors,
      areErrorsVisible,
    }: {
      fields: FormFields;
      fieldsErrors: ClusterErrors;
      areErrorsVisible: boolean;
    }) => (
      <AppContextProvider context={{ isCloudEnabled: true, basePath: basePathMock }}>
        <ConnectionMode
          fields={fields}
          onFieldsChange={(changedFields: Partial<FormFields>) => {}}
          fieldsErrors={fieldsErrors}
          areErrorsVisible={areErrorsVisible}
        />
      </AppContextProvider>
    );
    test('server name is required', () => {
      const component = mountWithIntl(
        <ComponentWithContext fields={formFields} fieldsErrors={{}} areErrorsVisible={false} />
      );

      const serverNameFormRow = findTestSubject(component, 'remoteClusterFormServerNameFormRow');
      expect(serverNameFormRow.find('label').text()).toBe('Server name');
    });

    test('renders no switch for sniff and proxy modes', () => {
      const component = mountWithIntl(
        <ComponentWithContext fields={formFields} fieldsErrors={{}} areErrorsVisible={false} />
      );

      const modeSwitch = findTestSubject(component, 'remoteClusterFormConnectionModeToggle');
      expect(modeSwitch.exists()).toBeFalsy();
    });

    test('renders a switch for cloud and manual modes', () => {
      const component = mountWithIntl(
        <ComponentWithContext fields={formFields} fieldsErrors={{}} areErrorsVisible={false} />
      );

      const cloudUrlSwitch = findTestSubject(component, 'remoteClusterFormCloudUrlToggle');
      expect(cloudUrlSwitch.exists()).toBeTruthy();
    });
  });
});
