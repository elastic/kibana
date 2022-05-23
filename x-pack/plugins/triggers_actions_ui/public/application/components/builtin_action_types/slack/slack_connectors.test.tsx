/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import { act } from '@testing-library/react';
import SlackActionFields from './slack_connectors';
import { FormTestProvider } from '../test_utils';

jest.mock('../../../../common/lib/kibana');

describe('SlackActionFields renders', () => {
  test('all connector fields is rendered', async () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'http:\\test',
      },
      id: 'test',
      actionTypeId: '.slack',
      name: 'slack',
      config: {},
    };

    const wrapper = mountWithIntl(
      <FormTestProvider connector={actionConnector}>
        {(registerPreSubmitValidator: ActionConnectorFieldsProps['registerPreSubmitValidator']) => (
          <SlackActionFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={registerPreSubmitValidator}
          />
        )}
      </FormTestProvider>
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('[data-test-subj="slackWebhookUrlInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="slackWebhookUrlInput"]').first().prop('value')).toBe(
      'http:\\test'
    );
  });
});
