/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from '@testing-library/react';
import TeamsActionFields from './teams_connectors';
import { ConnectorFormTestProvider } from '../test_utils';
jest.mock('../../../../common/lib/kibana');

describe('TeamsActionFields renders', () => {
  test('all connector fields are rendered', async () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'https:\\test',
      },
      id: 'test',
      actionTypeId: '.teams',
      name: 'teams',
      config: {},
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <TeamsActionFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="teamsWebhookUrlInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="teamsWebhookUrlInput"]').first().prop('value')).toBe(
      'https:\\test'
    );
  });
});
