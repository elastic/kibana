/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import ServiceNowParamsFields from './servicenow_params';
import { DocLinksStart } from 'kibana/public';
import { coreMock } from 'src/core/public/mocks';
import { AlertProvidedActionVariables } from '../../../lib/action_variables';

describe('ServiceNowParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const mocks = coreMock.createSetup();
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
        messageVariables={[{ name: AlertProvidedActionVariables.alertId, description: '' }]}
        docLinks={{ ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart}
        toastNotifications={mocks.notifications.toasts}
        http={mocks.http}
      />
    );
    expect(wrapper.find('[data-test-subj="urgencySelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('value')).toStrictEqual(
      '1'
    );
    expect(wrapper.find('[data-test-subj="impactSelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="titleInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="descriptionTextArea"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="commentTextArea"]').length > 0).toBeTruthy();

    // ensure savedObjectIdInput isnt rendered
    expect(wrapper.find('[data-test-subj="savedObjectIdInput"]').length === 0).toBeTruthy();
  });

  test('the savedObjectId fields is rendered if we cant find an alertId in the messageVariables', () => {
    const mocks = coreMock.createSetup();
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
        docLinks={{ ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart}
        toastNotifications={mocks.notifications.toasts}
        http={mocks.http}
      />
    );

    // ensure savedObjectIdInput isnt rendered
    expect(wrapper.find('[data-test-subj="savedObjectIdInput"]').length > 0).toBeTruthy();
  });
});
