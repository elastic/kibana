/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { showEventOverview } from './use_show_event_overview';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

const getFieldsData = jest.fn();

describe('showEventOverview', () => {
  describe('event renderer is not available', () => {
    const dataAsNestedObject = {} as unknown as Ecs;

    describe('event.kind is not event', () => {
      it('should return true if event.kind is in ecs allowed values', () => {
        getFieldsData.mockImplementation((field: string) => {
          if (field === 'event.kind') {
            return 'alert';
          }
        });
        expect(showEventOverview(getFieldsData, dataAsNestedObject)).toBe(true);
      });

      it('should return false if event.kind is not an ecs allowed values', () => {
        getFieldsData.mockImplementation((field: string) => {
          if (field === 'event.kind') {
            return 'not ecs';
          }
        });
        expect(showEventOverview(getFieldsData, dataAsNestedObject)).toBe(false);
      });

      it('should return false if event.kind is notavailable', () => {
        getFieldsData.mockImplementation(() => {});
        expect(showEventOverview(getFieldsData, dataAsNestedObject)).toBe(false);
      });
    });

    describe('event.kind is event', () => {
      it('should return true if event.category is in ecs allowed values', () => {
        getFieldsData.mockImplementation((field: string) => {
          if (field === 'event.kind') {
            return 'event';
          }
          if (field === 'event.category') {
            return 'file';
          }
        });
        expect(showEventOverview(getFieldsData, dataAsNestedObject)).toBe(true);
      });

      it('should return false if event.category is not an ecs allowed values', () => {
        getFieldsData.mockImplementation((field: string) => {
          if (field === 'event.kind') {
            return 'event';
          }
          if (field === 'event.category') {
            return 'not ecs';
          }
        });
        expect(showEventOverview(getFieldsData, dataAsNestedObject)).toBe(false);
      });
      it('should return false if event.category is not available', () => {
        getFieldsData.mockImplementation((field: string) => {
          if (field === 'event.kind') {
            return 'event';
          }
        });
        expect(showEventOverview(getFieldsData, dataAsNestedObject)).toBe(false);
      });
    });
  });

  describe('event renderer is available', () => {
    const dataAsNestedObject = { event: { module: ['suricata'] } } as unknown as Ecs;
    it('should return true', () => {
      expect(showEventOverview(getFieldsData, dataAsNestedObject)).toBe(true);
    });
  });
});
