/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseTechnicalFields } from './parse_technical_fields';

describe('parseTechnicalFields', () => {
  it('parses an alert with default fields without error', () => {
    const ALERT_WITH_DEFAULT_FIELDS = {
      '@timestamp': ['2021-12-06T12:30:59.411Z'],
      'kibana.alert.status': ['active'],
      'kibana.alert.duration.us': ['488935266000'],
      'kibana.alert.reason': ['host.uptime has reported no data over the past 1m for *'],
      'kibana.alert.workflow_status': ['open'],
      'kibana.alert.rule.uuid': ['c8ef4420-4604-11ec-b08c-c590e7b8c4cd'],
      'kibana.alert.rule.producer': ['infrastructure'],
      'kibana.alert.rule.consumer': ['alerts'],
      'kibana.alert.rule.category': ['Metric threshold'],
      'kibana.alert.start': ['2021-11-30T20:42:04.145Z'],
      'kibana.alert.rule.rule_type_id': ['metrics.alert.threshold'],
      'event.action': ['active'],
      'kibana.alert.rule.name': ['Uptime'],
      'kibana.alert.uuid': ['f31f5726-3c47-4c88-bc42-4e1fbde17e34'],
      'kibana.space_ids': ['default'],
      'kibana.version': ['8.1.0'],
      'event.kind': ['signal'],
    };
    expect(() => parseTechnicalFields(ALERT_WITH_DEFAULT_FIELDS)).not.toThrow();
  });

  it('parses an alert with missing required fields with error', () => {
    const ALERT_WITH_MISSING_REQUIRED_FIELDS = {
      '@timestamp': ['2021-12-06T12:30:59.411Z'],
      'kibana.alert.duration.us': ['488935266000'],
      'kibana.alert.reason': ['host.uptime has reported no data over the past 1m for *'],
      'kibana.alert.workflow_status': ['open'],
      'kibana.alert.start': ['2021-11-30T20:42:04.145Z'],
      'event.action': ['active'],
      'kibana.version': ['8.1.0'],
      'event.kind': ['signal'],
    };
    expect(() => parseTechnicalFields(ALERT_WITH_MISSING_REQUIRED_FIELDS)).toThrow();
  });

  it('parses a partial alert with missing required fields without error', () => {
    const ALERT_WITH_MISSING_REQUIRED_FIELDS = {
      '@timestamp': ['2021-12-06T12:30:59.411Z'],
      'kibana.alert.duration.us': ['488935266000'],
      'kibana.alert.reason': ['host.uptime has reported no data over the past 1m for *'],
      'kibana.alert.workflow_status': ['open'],
      'kibana.alert.start': ['2021-11-30T20:42:04.145Z'],
      'event.action': ['active'],
      'kibana.version': ['8.1.0'],
      'event.kind': ['signal'],
    };
    expect(() => parseTechnicalFields(ALERT_WITH_MISSING_REQUIRED_FIELDS, true)).not.toThrow();
  });

  it('parses an alert with missing optional fields without error', () => {
    const ALERT_WITH_MISSING_OPTIONAL_FIELDS = {
      '@timestamp': ['2021-12-06T12:30:59.411Z'],
      'kibana.alert.rule.uuid': ['c8ef4420-4604-11ec-b08c-c590e7b8c4cd'],
      'kibana.alert.status': ['active'],
      'kibana.alert.rule.producer': ['infrastructure'],
      'kibana.alert.rule.consumer': ['alerts'],
      'kibana.alert.rule.category': ['Metric threshold'],
      'kibana.alert.rule.rule_type_id': ['metrics.alert.threshold'],
      'kibana.alert.rule.name': ['Uptime'],
      'kibana.alert.uuid': ['f31f5726-3c47-4c88-bc42-4e1fbde17e34'],
      'kibana.space_ids': ['default'],
    };

    expect(() => parseTechnicalFields(ALERT_WITH_MISSING_OPTIONAL_FIELDS)).not.toThrow();
  });
});
