/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TableId } from '../../../common/types';
import { TimelineId } from '../../../common/types/timeline';
import { skipQueryForDetectionsPage } from './helpers';

describe('skipQueryForDetectionsPage', () => {
  test('Make sure to NOT skip the query when it is not a timeline from a detection pages', () => {
    expect(skipQueryForDetectionsPage(TimelineId.active, ['auditbeat-*', 'filebeat-*'])).toBe(
      false
    );
    expect(skipQueryForDetectionsPage(TableId.hostsPageEvents, ['auditbeat-*', 'filebeat-*'])).toBe(
      false
    );
    expect(
      skipQueryForDetectionsPage(TableId.networkPageEvents, ['auditbeat-*', 'filebeat-*'])
    ).toBe(false);
  });

  test('Make sure to SKIP the query when it is a timeline from a detection pages without the siem-signals', () => {
    expect(
      skipQueryForDetectionsPage(TableId.alertsOnAlertsPage, ['auditbeat-*', 'filebeat-*'])
    ).toBe(true);
    expect(
      skipQueryForDetectionsPage(TableId.alertsOnRuleDetailsPage, ['auditbeat-*', 'filebeat-*'])
    ).toBe(true);
  });

  test('Make sure to NOT skip the query when it is a timeline from a detection pages with the siem-signals', () => {
    expect(
      skipQueryForDetectionsPage(TableId.alertsOnAlertsPage, [
        'auditbeat-*',
        '.siem-signals-rainbow-butterfly',
      ])
    ).toBe(false);
    expect(
      skipQueryForDetectionsPage(TableId.alertsOnRuleDetailsPage, [
        '.siem-signals-rainbow-butterfly',
      ])
    ).toBe(false);
  });
});
