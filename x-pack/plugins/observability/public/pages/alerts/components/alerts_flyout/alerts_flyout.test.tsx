/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as useUiSettingHook from '../../../../../../../../src/plugins/kibana_react/public/ui_settings/use_ui_setting';
import { createObservabilityRuleTypeRegistryMock } from '../../../../rules/observability_rule_type_registry_mock';
import { render } from '../../../../utils/test_helper';
import type { TopAlert } from '../../containers/alerts_page';
import { AlertsFlyout } from '..';

describe('AlertsFlyout', () => {
  jest
    .spyOn(useUiSettingHook, 'useUiSetting')
    .mockImplementation(() => 'MMM D, YYYY @ HH:mm:ss.SSS');
  const observabilityRuleTypeRegistryMock = createObservabilityRuleTypeRegistryMock();

  it('should include a indicator for an active alert', async () => {
    const flyout = render(
      <AlertsFlyout
        alert={activeAlert}
        observabilityRuleTypeRegistry={observabilityRuleTypeRegistryMock}
        onClose={jest.fn()}
      />
    );

    expect(flyout.getByText('Active')).toBeInTheDocument();
  });

  it('should include a indicator for a recovered alert', async () => {
    const flyout = render(
      <AlertsFlyout
        alert={recoveredAlert}
        observabilityRuleTypeRegistry={observabilityRuleTypeRegistryMock}
        onClose={jest.fn()}
      />
    );

    expect(flyout.getByText('Recovered')).toBeInTheDocument();
  });
});

const activeAlert: TopAlert = {
  link: '/app/logs/link-to/default/logs?time=1630587249674',
  reason: '1957 log entries (more than 100.25) match the conditions.',
  fields: {
    'kibana.alert.status': 'active',
    '@timestamp': '2021-09-02T13:08:51.750Z',
    'kibana.alert.duration.us': 882076000,
    'kibana.alert.reason': '1957 log entries (more than 100.25) match the conditions.',
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.rule.uuid': 'db2ab7c0-0bec-11ec-9ae2-5b10ca924404',
    'kibana.alert.rule.producer': 'logs',
    'kibana.alert.rule.consumer': 'logs',
    'kibana.alert.rule.category': 'Log threshold',
    'kibana.alert.start': '2021-09-02T12:54:09.674Z',
    'kibana.alert.rule.rule_type_id': 'logs.alert.document.count',
    'event.action': 'active',
    'kibana.alert.evaluation.value': 1957,
    'kibana.alert.instance.id': '*',
    'kibana.alert.rule.name': 'Log threshold (from logs)',
    'kibana.alert.uuid': '756240e5-92fb-452f-b08e-cd3e0dc51738',
    'kibana.space_ids': ['default'],
    'kibana.version': '8.0.0',
    'event.kind': 'signal',
    'kibana.alert.evaluation.threshold': 100.25,
  },
  active: true,
  start: 1630587249674,
};

const recoveredAlert: TopAlert = {
  link: '/app/metrics/inventory',
  reason: 'CPU usage is greater than a threshold of 38 (current value is 38%)',
  fields: {
    'kibana.alert.status': 'recovered',
    '@timestamp': '2021-09-02T13:08:45.729Z',
    'kibana.alert.duration.us': 189030000,
    'kibana.alert.reason': 'CPU usage is greater than a threshold of 38 (current value is 38%)',
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.rule.uuid': '92f112f0-0bed-11ec-9ae2-5b10ca924404',
    'kibana.alert.rule.producer': 'infrastructure',
    'kibana.alert.rule.consumer': 'infrastructure',
    'kibana.alert.rule.category': 'Inventory',
    'kibana.alert.start': '2021-09-02T13:05:36.699Z',
    'kibana.alert.rule.rule_type_id': 'metrics.alert.inventory.threshold',
    'event.action': 'close',
    'kibana.alert.instance.id': 'gke-edge-oblt-gcp-edge-oblt-gcp-pool-b6b9e929-vde2',
    'kibana.alert.rule.name': 'Metrics inventory (from Metrics)',
    'kibana.alert.uuid': '4f3a9ee4-aa45-47fd-a39a-a78758782425',
    'kibana.space_ids': ['default'],
    'kibana.version': '8.0.0',
    'event.kind': 'signal',
    'kibana.alert.end': '2021-09-02T13:08:45.729Z',
  },
  active: false,
  start: 1630587936699,
};
