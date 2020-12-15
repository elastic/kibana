/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import ServiceNowParamsFields from './servicenow_params';
import { AlertProvidedActionVariables } from '../../../lib/action_variables';

describe('ServiceNowParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const actionParams = {
      subAction: 'pushToService',
      subActionParams: {
        incident: {
          short_description: 'sn title',
          description: 'some description',
          severity: '1',
          urgency: '2',
          impact: '3',
          savedObjectId: '123',
          externalId: null,
        },
        comments: [{ commentId: '1', comment: 'comment for sn' }],
      },
    };

    const wrapper = mountWithIntl(
      <ServiceNowParamsFields
        actionParams={actionParams}
        errors={{ short_description: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[{ name: AlertProvidedActionVariables.alertId, description: '' }]}
      />
    );
    expect(wrapper.find('[data-test-subj="urgencySelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('value')).toStrictEqual(
      '1'
    );
    expect(wrapper.find('[data-test-subj="impactSelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="short_descriptionInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="descriptionTextArea"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').length > 0).toBeTruthy();
  });
});
