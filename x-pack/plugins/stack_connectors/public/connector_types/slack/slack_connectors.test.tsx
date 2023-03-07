/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act, render } from '@testing-library/react';
import SlackActionFields from './slack_connectors';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

describe('SlackActionFields renders', () => {
  test('all connector fields is rendered', async () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'http://test.com',
      },
      id: 'test',
      actionTypeId: '.slack',
      name: 'slack',
      config: {},
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <SlackActionFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="slackWebhookUrlInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="slackWebhookUrlInput"]').first().prop('value')).toBe(
      'http://test.com'
    );
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('connector validation succeeds when connector config is valid', async () => {
      const actionConnector = {
        secrets: {
          webhookUrl: 'http://test.com',
        },
        id: 'test',
        actionTypeId: '.slack',
        name: 'slack',
        config: {},
        isDeprecated: false,
      };

      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <SlackActionFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {
          secrets: {
            webhookUrl: 'http://test.com',
          },
          id: 'test',
          actionTypeId: '.slack',
          name: 'slack',
          isDeprecated: false,
        },
        isValid: true,
      });
    });

    it('validates teh web hook url field correctly', async () => {
      const actionConnector = {
        secrets: {
          webhookUrl: 'http://test.com',
        },
        id: 'test',
        actionTypeId: '.slack',
        name: 'slack',
        config: {},
        isDeprecated: false,
      };

      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <SlackActionFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.type(
          getByTestId('slackWebhookUrlInput'),
          `{selectall}{backspace}no-valid`,
          {
            delay: 10,
          }
        );
      });

      await act(async () => {
        userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });
});
