/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import SwimlaneActionConnectorFields from './swimlane_connectors';
import { useGetApplication } from './use_get_application';
import { applicationFields, mappings } from './mocks';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { waitFor, render, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
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
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'all',
        mappings,
      },
      secrets: {
        apiToken: 'test',
      },
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <SwimlaneActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="swimlaneApiUrlInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneAppIdInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneApiTokenInput"]').exists()).toBeTruthy();
  });

  test('renders the mappings correctly - connector type all', async () => {
    getApplication.mockResolvedValue({
      fields: applicationFields,
    });

    const actionConnector = {
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'all',
        mappings,
      },
      secrets: {
        apiToken: 'test',
      },
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <SwimlaneActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await act(async () => {
      wrapper.find('button[data-test-subj="swimlaneConfigureMapping"]').first().simulate('click');
      await nextTick();
      wrapper.update();
    });

    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="swimlaneAlertIdInput"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="swimlaneAlertNameInput"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="swimlaneSeverityInput"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="swimlaneCaseIdConfig"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="swimlaneCaseNameConfig"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="swimlaneCommentsConfig"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="swimlaneDescriptionConfig"]').exists()).toBeTruthy();
    });
  });

  test('renders the mappings correctly - connector type cases', async () => {
    getApplication.mockResolvedValue({
      fields: applicationFields,
    });

    const actionConnector = {
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'cases',
        mappings,
      },
      secrets: {
        apiToken: 'test',
      },
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <SwimlaneActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await act(async () => {
      wrapper.find('button[data-test-subj="swimlaneConfigureMapping"]').first().simulate('click');
      await nextTick();
      wrapper.update();
    });

    await waitFor(() => {});
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
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'alerts',
        mappings,
      },
      secrets: {
        apiToken: 'test',
      },
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <SwimlaneActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await act(async () => {
      wrapper.find('button[data-test-subj="swimlaneConfigureMapping"]').first().simulate('click');
      await nextTick();
      wrapper.update();
    });

    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="swimlaneAlertIdInput"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="swimlaneAlertNameInput"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="swimlaneSeverityInput"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="swimlaneCaseIdConfig"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="swimlaneCaseNameConfig"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="swimlaneCommentsConfig"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="swimlaneDescriptionConfig"]').exists()).toBeFalsy();
    });
  });

  test('renders the correct options per field', async () => {
    getApplication.mockResolvedValue({
      fields: applicationFields,
    });

    const actionConnector = {
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http://test.com',
        appId: '1234567asbd32',
        connectorType: 'all',
        mappings,
      },
      secrets: {
        apiToken: 'test',
      },
      isDeprecated: false,
    };

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
      <ConnectorFormTestProvider connector={actionConnector}>
        <SwimlaneActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await waitFor(async () => {
      await nextTick();
      wrapper.update();
      expect(wrapper.find('[data-test-subj="swimlaneApiUrlInput"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="swimlaneAppIdInput"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="swimlaneApiTokenInput"]').exists()).toBeTruthy();
    });

    await act(async () => {
      wrapper.find('button[data-test-subj="swimlaneConfigureMapping"]').first().simulate('click');
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

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      getApplication.mockResolvedValue({
        fields: applicationFields,
      });
    });

    const getConnector = (connectorType: string = 'all') => ({
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http://test.com',
        appId: '1234567asbd32',
        connectorType: 'all',
        mappings,
      },
      secrets: {
        apiToken: 'test',
      },
      isDeprecated: false,
    });

    const getConnectorWithEmptyMappings = (connectorType: string = 'all') => {
      const actionConnector = getConnector(connectorType);
      return {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          connectorType,
          mappings: {},
        },
      };
    };

    const tests: Array<[string, string]> = [
      ['swimlaneApiUrlInput', 'not-valid'],
      ['swimlaneAppIdInput', ''],
      ['swimlaneApiTokenInput', ''],
    ];

    it.each([['cases'], ['alerts']])(
      'connector validation succeeds when connector config is valid for connectorType=%p',
      async (connectorType) => {
        const connector = getConnector(connectorType);
        const { getByTestId } = render(
          <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
            <SwimlaneActionConnectorFields
              readOnly={false}
              isEdit={false}
              registerPreSubmitValidator={() => {}}
            />
          </ConnectorFormTestProvider>
        );

        await act(async () => {
          userEvent.click(getByTestId('form-test-provide-submit'));
        });

        expect(onSubmit).toHaveBeenCalledWith({ data: { ...connector }, isValid: true });
      }
    );

    it.each(tests)('validates correctly %p', async (field, value) => {
      const connector = getConnector();
      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <SwimlaneActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.type(res.getByTestId(field), `{selectall}{backspace}${value}`, {
          delay: 10,
        });
      });

      await act(async () => {
        userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });

    it('connector validation succeeds when when connectorType=all with empty mappings', async () => {
      const connector = getConnectorWithEmptyMappings();
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <SwimlaneActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toHaveBeenCalledWith({
        data: {
          ...connector,
          config: {
            ...connector.config,
            mappings: {
              alertIdConfig: null,
              caseIdConfig: null,
              caseNameConfig: null,
              commentsConfig: null,
              descriptionConfig: null,
              ruleNameConfig: null,
              severityConfig: null,
            },
          },
        },
        isValid: true,
      });
    });

    it.each([['cases'], ['alerts']])(
      'validates correctly when when connectorType=%p',
      async (connectorType) => {
        const connector = getConnectorWithEmptyMappings(connectorType);

        const { getByTestId } = render(
          <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
            <SwimlaneActionConnectorFields
              readOnly={false}
              isEdit={false}
              registerPreSubmitValidator={() => {}}
            />
          </ConnectorFormTestProvider>
        );

        await act(async () => {
          userEvent.click(getByTestId('form-test-provide-submit'));
        });

        expect(onSubmit).toHaveBeenCalledWith({
          data: {},
          isValid: false,
        });
      }
    );
  });
});
