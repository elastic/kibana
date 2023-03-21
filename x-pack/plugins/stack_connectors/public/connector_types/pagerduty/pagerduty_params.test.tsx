/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EventActionOptions, SeverityActionOptions } from '../types';
import PagerDutyParamsFields from './pagerduty_params';

describe('PagerDutyParamsFields renders', () => {
  test('all params fields is rendered', () => {
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
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
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

  test('params select fields do not auto set values eventActionSelect', () => {
    const actionParams = {};

    const wrapper = mountWithIntl(
      <PagerDutyParamsFields
        actionParams={actionParams}
        errors={{ summary: [], timestamp: [], dedupKey: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(wrapper.find('[data-test-subj="eventActionSelect"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="eventActionSelect"]').first().prop('value')
    ).toStrictEqual(undefined);
  });

  test('params select fields do not auto set values severitySelect', () => {
    const actionParams = {
      eventAction: EventActionOptions.TRIGGER,
      dedupKey: 'test',
    };

    const wrapper = mountWithIntl(
      <PagerDutyParamsFields
        actionParams={actionParams}
        errors={{ summary: [], timestamp: [], dedupKey: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(wrapper.find('[data-test-subj="severitySelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('value')).toStrictEqual(
      undefined
    );
  });

  test('only eventActionSelect is available as a payload params for PagerDuty Resolve event', () => {
    const actionParams = {
      eventAction: EventActionOptions.RESOLVE,
      dedupKey: 'test',
    };

    const wrapper = mountWithIntl(
      <PagerDutyParamsFields
        actionParams={actionParams}
        errors={{ summary: [], timestamp: [], dedupKey: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(wrapper.find('[data-test-subj="dedupKeyInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="dedupKeyInput"]').first().prop('value')).toStrictEqual(
      'test'
    );
    expect(wrapper.find('[data-test-subj="eventActionSelect"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="eventActionSelect"]').first().prop('value')
    ).toStrictEqual('resolve');
    expect(wrapper.find('[data-test-subj="dedupKeyInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="timestampInput"]').length > 0).toBeFalsy();
    expect(wrapper.find('[data-test-subj="componentInput"]').length > 0).toBeFalsy();
    expect(wrapper.find('[data-test-subj="groupInput"]').length > 0).toBeFalsy();
    expect(wrapper.find('[data-test-subj="sourceInput"]').length > 0).toBeFalsy();
    expect(wrapper.find('[data-test-subj="summaryInput"]').length > 0).toBeFalsy();
  });
});
