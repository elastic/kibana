/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import ServiceNowParamsFields from './servicenow_params';

describe('ServiceNowParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const actionParams = {
      subAction: 'pushToService',
      subActionParams: {
        title: 'sn title',
        description: 'some description',
        comment: 'comment for sn',
        severity: '1',
        urgency: '2',
        impact: '3',
        savedObjectId: '123',
        externalId: null,
      },
    };
    const wrapper = mountWithIntl(
      <ServiceNowParamsFields
        actionParams={actionParams}
        errors={{ title: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[]}
      />
    );
    expect(wrapper.find('[data-test-subj="urgencySelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('value')).toStrictEqual(
      '1'
    );
    expect(wrapper.find('[data-test-subj="impactSelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="titleInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="incidentDescriptionTextArea"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="incidentCommentTextArea"]').length > 0).toBeTruthy();
  });
});
