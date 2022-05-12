/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { SwimlaneActionConnector } from './types';
import SwimlaneActionConnectorFields from './swimlane_connectors';
import { useGetApplication } from './use_get_application';
import { applicationFields, mappings } from './mocks';

jest.mock('../../../../common/lib/kibana');
jest.mock('./use_get_application');

const useGetApplicationMock = useGetApplication as jest.Mock;
const getApplication = jest.fn();

describe('SwimlaneActionConnectorFields renders', () => {
  beforeAll(() => {
    useGetApplicationMock.mockReturnValue({
      getApplication,
      isLoading: false,
    });
  });

  test('all connector fields are rendered', async () => {
    const actionConnector = {
      secrets: {
        apiToken: 'test',
      },
      id: 'test',
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'all',
        mappings,
      },
    } as SwimlaneActionConnector;

    const wrapper = mountWithIntl(
      <SwimlaneActionConnectorFields
        action={actionConnector}
        errors={{ connectorType: [], appId: [], apiUrl: [], mappings: [], apiToken: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="swimlaneApiUrlInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneAppIdInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneApiTokenInput"]').exists()).toBeTruthy();
  });

  test('should display a message on create to remember credentials', () => {
    const actionConnector = {
      actionTypeId: '.swimlane',
      secrets: {},
      config: {},
    } as SwimlaneActionConnector;

    const wrapper = mountWithIntl(
      <SwimlaneActionConnectorFields
        action={actionConnector}
        errors={{ connectorType: [], appId: [], apiUrl: [], mappings: [], apiToken: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="rememberValuesMessage"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="reenterValuesMessage"]').length).toEqual(0);
  });

  test('should display a message on edit to re-enter credentials', () => {
    const actionConnector = {
      secrets: {
        apiToken: 'test',
      },
      id: 'test',
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'all',
        mappings,
      },
    } as SwimlaneActionConnector;

    const wrapper = mountWithIntl(
      <SwimlaneActionConnectorFields
        action={actionConnector}
        errors={{ connectorType: [], appId: [], apiUrl: [], mappings: [], apiToken: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="reenterValuesMessage"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="rememberValuesMessage"]').length).toEqual(0);
  });

  test('renders the mappings correctly - connector type all', async () => {
    getApplication.mockResolvedValue({
      fields: applicationFields,
    });

    const actionConnector = {
      secrets: {
        apiToken: 'test',
      },
      id: 'test',
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'all',
        mappings,
      },
    } as SwimlaneActionConnector;

    const wrapper = mountWithIntl(
      <SwimlaneActionConnectorFields
        action={actionConnector}
        errors={{ connectorType: [], appId: [], apiUrl: [], mappings: [], apiToken: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );

    await act(async () => {
      wrapper.find('[data-test-subj="swimlaneConfigureMapping"]').first().simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="swimlaneAlertIdInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneAlertNameInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneSeverityInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneCaseIdConfig"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneCaseNameConfig"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneCommentsConfig"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneDescriptionConfig"]').exists()).toBeTruthy();
  });

  test('renders the mappings correctly - connector type cases', async () => {
    getApplication.mockResolvedValue({
      fields: applicationFields,
    });

    const actionConnector = {
      secrets: {
        apiToken: 'test',
      },
      id: 'test',
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'cases',
        mappings,
      },
    } as SwimlaneActionConnector;

    const wrapper = mountWithIntl(
      <SwimlaneActionConnectorFields
        action={actionConnector}
        errors={{ connectorType: [], appId: [], apiUrl: [], mappings: [], apiToken: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );

    await act(async () => {
      wrapper.find('[data-test-subj="swimlaneConfigureMapping"]').first().simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="swimlaneAlertIdInput"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="swimlaneAlertNameInput"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="swimlaneSeverityInput"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="swimlaneCaseIdConfig"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneCaseNameConfig"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneCommentsConfig"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneDescriptionConfig"]').exists()).toBeTruthy();
  });

  test('renders the mappings correctly - connector type alerts', async () => {
    getApplication.mockResolvedValue({
      fields: applicationFields,
    });

    const actionConnector = {
      secrets: {
        apiToken: 'test',
      },
      id: 'test',
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'alerts',
        mappings,
      },
    } as SwimlaneActionConnector;

    const wrapper = mountWithIntl(
      <SwimlaneActionConnectorFields
        action={actionConnector}
        errors={{ connectorType: [], appId: [], apiUrl: [], mappings: [], apiToken: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );

    await act(async () => {
      wrapper.find('[data-test-subj="swimlaneConfigureMapping"]').first().simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="swimlaneAlertIdInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneAlertNameInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneSeverityInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneCaseIdConfig"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="swimlaneCaseNameConfig"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="swimlaneCommentsConfig"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneDescriptionConfig"]').exists()).toBeFalsy();
  });

  test('renders the correct options per field', async () => {
    getApplication.mockResolvedValue({
      fields: applicationFields,
    });

    const actionConnector = {
      secrets: {
        apiToken: 'test',
      },
      id: 'test',
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'all',
        mappings,
      },
    } as SwimlaneActionConnector;

    const textOptions = [
      { label: 'Alert Id (alert-id)', value: 'a6ide' },
      { label: 'Severity (severity)', value: 'adnlas' },
      { label: 'Rule Name (rule-name)', value: 'adnfls' },
      { label: 'Case Id (case-id-name)', value: 'a6sst' },
      { label: 'Case Name (case-name)', value: 'a6fst' },
      { label: 'Description (description)', value: 'a6fde' },
    ];

    const commentOptions = [{ label: 'Comments (notes)', value: 'a6fdf' }];

    const wrapper = mountWithIntl(
      <SwimlaneActionConnectorFields
        action={actionConnector}
        errors={{ connectorType: [], appId: [], apiUrl: [], mappings: [], apiToken: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );

    await act(async () => {
      wrapper.find('[data-test-subj="swimlaneConfigureMapping"]').first().simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="swimlaneAlertIdInput"]').first().prop('options')).toEqual(
      textOptions
    );
    expect(
      wrapper.find('[data-test-subj="swimlaneAlertNameInput"]').first().prop('options')
    ).toEqual(textOptions);
    expect(
      wrapper.find('[data-test-subj="swimlaneSeverityInput"]').first().prop('options')
    ).toEqual(textOptions);
    expect(wrapper.find('[data-test-subj="swimlaneCaseIdConfig"]').first().prop('options')).toEqual(
      textOptions
    );
    expect(
      wrapper.find('[data-test-subj="swimlaneCaseNameConfig"]').first().prop('options')
    ).toEqual(textOptions);
    expect(
      wrapper.find('[data-test-subj="swimlaneCommentsConfig"]').first().prop('options')
    ).toEqual(commentOptions);
    expect(
      wrapper.find('[data-test-subj="swimlaneDescriptionConfig"]').first().prop('options')
    ).toEqual(textOptions);
  });
});
