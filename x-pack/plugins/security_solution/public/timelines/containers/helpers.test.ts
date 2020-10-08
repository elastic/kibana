/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelineId } from '../../../common/types/timeline';
import { skipQueryForDetectionsPage } from './helpers';

describe('skipQueryForDetectionsPage', () => {
  test('Make sure to NOT skip the query when it is not a timeline from a detection pages', () => {
    expect(skipQueryForDetectionsPage(TimelineId.active, ['auditbeat-*', 'filebeat-*'])).toBe(
      false
    );
    expect(
      skipQueryForDetectionsPage(TimelineId.hostsPageEvents, ['auditbeat-*', 'filebeat-*'])
    ).toBe(false);
    expect(
      skipQueryForDetectionsPage(TimelineId.hostsPageExternalAlerts, ['auditbeat-*', 'filebeat-*'])
    ).toBe(false);
    expect(
      skipQueryForDetectionsPage(TimelineId.networkPageExternalAlerts, [
        'auditbeat-*',
        'filebeat-*',
      ])
    ).toBe(false);
  });

  test('Make sure to SKIP the query when it is a timeline from a detection pages without the siem-signals', () => {
    expect(
      skipQueryForDetectionsPage(TimelineId.detectionsPage, ['auditbeat-*', 'filebeat-*'])
    ).toBe(true);
    expect(
      skipQueryForDetectionsPage(TimelineId.detectionsRulesDetailsPage, [
        'auditbeat-*',
        'filebeat-*',
      ])
    ).toBe(true);
  });

  test('Make sure to NOT skip the query when it is a timeline from a detection pages with the siem-signals', () => {
    expect(
      skipQueryForDetectionsPage(TimelineId.detectionsPage, [
        'auditbeat-*',
        '.siem-signals-rainbow-butterfly',
      ])
    ).toBe(false);
    expect(
      skipQueryForDetectionsPage(TimelineId.detectionsRulesDetailsPage, [
        '.siem-signals-rainbow-butterfly',
      ])
    ).toBe(false);
  });
});
