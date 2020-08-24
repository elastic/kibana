/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelineId } from '../../../common/types/timeline';
import { skipQueryForDetectionsPage } from './helpers';

describe('skipQueryForDetectionsPage', () => {
  describe('Make sure to NOT skip the query when it is not a timeline from a detection pages', () => {
    test('It should NOT skip the query when it is on the active page and both the defaultIndex and the Kibana index matches each other', () => {
      expect(
        skipQueryForDetectionsPage({
          id: TimelineId.active,
          defaultIndex: ['auditbeat-*', 'filebeat-*'],
          defaultKibanaIndex: ['auditbeat-*', 'filebeat-*'],
        })
      ).toBe(false);
    });

    test('It should NOT skip the query when it is on the active page and both the defaultIndex and the Kibana index do NOT match each other', () => {
      expect(
        skipQueryForDetectionsPage({
          id: TimelineId.active,
          defaultIndex: ['auditbeat-*', 'filebeat-*'],
          defaultKibanaIndex: ['auditbeat-*'],
        })
      ).toBe(false);
    });

    test('It should NOT skip the query when it is on the hosts page events and both the defaultIndex and the Kibana index matches each other', () => {
      expect(
        skipQueryForDetectionsPage({
          id: TimelineId.hostsPageEvents,
          defaultIndex: ['auditbeat-*', 'filebeat-*'],
          defaultKibanaIndex: ['auditbeat-*', 'filebeat-*'],
        })
      ).toBe(false);
    });

    test('It should NOT skip the query when it is on the hosts page events and both the defaultIndex and the Kibana index do not match each other', () => {
      expect(
        skipQueryForDetectionsPage({
          id: TimelineId.hostsPageEvents,
          defaultIndex: ['auditbeat-*', 'filebeat-*'],
          defaultKibanaIndex: ['auditbeat-*'],
        })
      ).toBe(false);
    });

    test('It should NOT skip the query when it is on the network external events page and both the defaultIndex and the Kibana index matches each other', () => {
      expect(
        skipQueryForDetectionsPage({
          id: TimelineId.networkPageExternalAlerts,
          defaultIndex: ['auditbeat-*', 'filebeat-*'],
          defaultKibanaIndex: ['auditbeat-*', 'filebeat-*'],
        })
      ).toBe(false);
    });

    test('It should NOT skip the query when it is on the network external events page and both the defaultIndex and the Kibana index do not match each other', () => {
      expect(
        skipQueryForDetectionsPage({
          id: TimelineId.networkPageExternalAlerts,
          defaultIndex: ['auditbeat-*', 'filebeat-*'],
          defaultKibanaIndex: ['auditbeat-*'],
        })
      ).toBe(false);
    });
  });

  describe('Make sure to SKIP and not SKIP the query when it is a timeline from a detection pages without the siem-signals', () => {
    test('It should SKIP the query when it is a timeline from a detection page without the siem-signals', () => {
      expect(
        skipQueryForDetectionsPage({
          id: TimelineId.detectionsPage,
          defaultIndex: ['auditbeat-*', 'filebeat-*'],
          defaultKibanaIndex: ['auditbeat-*', 'filebeat-*'],
        })
      ).toBe(true);
    });

    test('It should SKIP the query when it is a timeline from a detection details page without the siem-signals', () => {
      expect(
        skipQueryForDetectionsPage({
          id: TimelineId.detectionsRulesDetailsPage,
          defaultIndex: ['auditbeat-*', 'filebeat-*'],
          defaultKibanaIndex: ['auditbeat-*', 'filebeat-*'],
        })
      ).toBe(true);
    });
  });

  describe('Make sure to NOT skip the query when it is a timeline from a detection pages with the siem-signals', () => {
    test('It should NOT SKIP the query when it is a timeline from a detection page with the siem-signals', () => {
      expect(
        skipQueryForDetectionsPage({
          id: TimelineId.detectionsPage,
          defaultIndex: ['auditbeat-*', 'filebeat-*', '.siem-signals-default'],
          defaultKibanaIndex: ['auditbeat-*', 'filebeat-*'],
        })
      ).toBe(false);
    });

    test('It should NOT SKIP the query when it is a timeline from a detection page with the siem-signals and it is named something else', () => {
      expect(
        skipQueryForDetectionsPage({
          id: TimelineId.detectionsPage,
          defaultIndex: ['auditbeat-*', 'filebeat-*', 'some-other-signals-name'],
          defaultKibanaIndex: ['auditbeat-*', 'filebeat-*'],
        })
      ).toBe(false);
    });

    test('It should NOT skip the query when it is a timeline from a detection details page with the siem-signals and it is named something else', () => {
      expect(
        skipQueryForDetectionsPage({
          id: TimelineId.detectionsRulesDetailsPage,
          defaultIndex: ['auditbeat-*', 'filebeat-*', 'some-other-signals-name'],
          defaultKibanaIndex: ['auditbeat-*', 'filebeat-*'],
        })
      ).toBe(false);
    });
  });
});
