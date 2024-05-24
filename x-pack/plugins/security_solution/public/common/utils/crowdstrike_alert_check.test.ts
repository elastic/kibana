/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

import {
  isAlertFromCrowdstrikeAlert,
  isAlertFromCrowdstrikeEvent,
} from './crowdstrike_alert_check';

describe('crowdstrike_alert_check', () => {
  describe('isAlertFromCrowdstrikeEvent', () => {
    it('returns false if data is not a timeline event alert', () => {
      const data: TimelineEventsDetailsItem[] = [];
      expect(isAlertFromCrowdstrikeEvent({ data })).toBe(false);
    });

    it('returns false if data is a timeline event alert but not from Crowdstrike', () => {
      const data = [
        {
          category: 'kibana',
          field: 'kibana.alert.rule.uuid',
        },
      ] as unknown as TimelineEventsDetailsItem[];
      expect(isAlertFromCrowdstrikeEvent({ data })).toBe(false);
    });

    it('returns true if data is a Crowdstrike timeline event alert', () => {
      const data = [
        {
          category: 'kibana',
          field: 'kibana.alert.rule.uuid',
        },
        {
          field: 'event.module',
          values: ['crowdstrike'],
        },
      ] as unknown as TimelineEventsDetailsItem[];
      expect(isAlertFromCrowdstrikeEvent({ data })).toBe(true);
    });
  });

  describe('isAlertFromCrowdstrikeAlert', () => {
    it('returns false if ecsData is null', () => {
      expect(isAlertFromCrowdstrikeAlert({ ecsData: null })).toBe(false);
    });

    it('returns false if ecsData is not a Crowdstrike alert', () => {
      const ecsData = {
        'kibana.alert.original_event.module': ['other'],
        'kibana.alert.original_event.dataset': ['other'],
      } as unknown as Ecs;
      expect(isAlertFromCrowdstrikeAlert({ ecsData })).toBe(false);
    });

    it('returns true if ecsData is a Crowdstrike alert', () => {
      const ecsData = {
        'kibana.alert.original_event.module': ['crowdstrike'],
        'kibana.alert.original_event.dataset': ['alert'],
      } as unknown as Ecs;
      expect(isAlertFromCrowdstrikeAlert({ ecsData })).toBe(true);
    });
  });
});
