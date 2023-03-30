/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import PagerDutyActionConnectorFields from './pagerduty_connectors';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

describe('PagerDutyActionConnectorFields renders', () => {
  test('all connector fields is rendered', async () => {
    const actionConnector = {
      secrets: {
        routingKey: 'test',
      },
      id: 'test',
      actionTypeId: '.pagerduty',
      name: 'pagerduty',
      config: {
        apiUrl: 'http://test.com',
      },
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <PagerDutyActionConnectorFields
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

    expect(wrapper.find('[data-test-subj="pagerdutyApiUrlInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="pagerdutyApiUrlInput"]').first().prop('value')).toBe(
      'http://test.com'
    );
    expect(wrapper.find('[data-test-subj="pagerdutyRoutingKeyInput"]').length > 0).toBeTruthy();
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('connector validation succeeds when connector config is valid', async () => {
      const actionConnector = {
        secrets: {
          routingKey: 'test',
        },
        id: 'test',
        actionTypeId: '.pagerduty',
        name: 'pagerduty',
        config: {
          apiUrl: 'http://test.com',
        },
        isDeprecated: false,
      };

      const res = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <PagerDutyActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {
          secrets: {
            routingKey: 'test',
          },
          id: 'test',
          actionTypeId: '.pagerduty',
          name: 'pagerduty',
          config: {
            apiUrl: 'http://test.com',
          },
          isDeprecated: false,
        },
        isValid: true,
      });
    });

    it('validates correctly if the apiUrl is empty', async () => {
      const actionConnector = {
        secrets: {
          routingKey: 'test',
        },
        id: 'test',
        actionTypeId: '.pagerduty',
        name: 'pagerduty',
        config: {
          apiUrl: '',
        },
        isDeprecated: false,
      };

      const res = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <PagerDutyActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {
          secrets: {
            routingKey: 'test',
          },
          id: 'test',
          actionTypeId: '.pagerduty',
          name: 'pagerduty',
          isDeprecated: false,
        },
        isValid: true,
      });
    });

    it('validates correctly if the apiUrl is not empty and not a valid url', async () => {
      const actionConnector = {
        secrets: {
          routingKey: 'test',
        },
        id: 'test',
        actionTypeId: '.pagerduty',
        name: 'pagerduty',
        config: {
          apiUrl: 'not-valid',
        },
        isDeprecated: false,
      };

      const res = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <PagerDutyActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
      });
    });

    it('validates correctly the routingKey', async () => {
      const actionConnector = {
        secrets: {
          routingKey: '',
        },
        id: 'test',
        actionTypeId: '.pagerduty',
        name: 'pagerduty',
        config: {
          apiUrl: 'not-valid',
        },
        isDeprecated: false,
      };

      const res = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <PagerDutyActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
      });
    });
  });
});
