/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { EventActionOptions, SeverityActionOptions } from '.././types';
import PagerDutyParamsFields from './pagerduty_params';
import { DocLinksStart } from 'kibana/public';
import { coreMock } from 'src/core/public/mocks';

describe('PagerDutyParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const mocks = coreMock.createSetup();
    const actionParams = {
      eventAction: EventActionOptions.TRIGGER,
      dedupKey: 'test',
      summary: '2323',
      source: 'source',
      severity: SeverityActionOptions.CRITICAL,
      timestamp: new Date().toISOString(),
      component: 'test',
      group: 'group',
      class: 'test class',
    };

    const wrapper = mountWithIntl(
      <PagerDutyParamsFields
        actionParams={actionParams}
        errors={{ summary: [], timestamp: [], dedupKey: [] }}
        editAction={() => {}}
        index={0}
        docLinks={{ ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart}
        toastNotifications={mocks.notifications.toasts}
        http={mocks.http}
      />
    );
    expect(wrapper.find('[data-test-subj="severitySelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('value')).toStrictEqual(
      'critical'
    );
    expect(wrapper.find('[data-test-subj="dedupKeyInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="dedupKeyInput"]').first().prop('value')).toStrictEqual(
      'test'
    );
    expect(wrapper.find('[data-test-subj="eventActionSelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="dedupKeyInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="timestampInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="componentInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="groupInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="sourceInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="summaryInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="dedupKeyAddVariableButton"]').length > 0).toBeTruthy();
  });

  test('dedupKey field is set default as {{alertInstanceId}} if not defined', async () => {
    const mocks = coreMock.createSetup();
    const actionParams = {
      eventAction: EventActionOptions.TRIGGER,
      summary: '2323',
    };

    const wrapper = mountWithIntl(
      <PagerDutyParamsFields
        actionParams={actionParams}
        errors={{ summary: [], timestamp: [], dedupKey: [] }}
        editAction={() => {}}
        index={0}
        docLinks={{ ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart}
        toastNotifications={mocks.notifications.toasts}
        http={mocks.http}
      />
    );

    expect(wrapper.find('[data-test-subj="dedupKeyInput"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="dedupKeyInput"]').first().props().defaultValue
    ).toStrictEqual('{{alertInstanceId}}');
  });
});
