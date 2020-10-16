/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EndpointDocGenerator } from '../generate_data';
import { isProcessRunning } from './event';
import { SafeResolverEvent } from '../types';

describe('Generated documents', () => {
  let generator: EndpointDocGenerator;
  beforeEach(() => {
    generator = new EndpointDocGenerator('seed');
  });

  describe('Process running events', () => {
    it('is a running event when event.type is a string', () => {
      const event: SafeResolverEvent = generator.generateEvent({
        eventType: 'start',
      });
      expect(isProcessRunning(event)).toBeTruthy();
    });

    it('is a running event when event.type is an array of strings', () => {
      const event: SafeResolverEvent = generator.generateEvent({
        eventType: ['start'],
      });
      expect(isProcessRunning(event)).toBeTruthy();
    });

    it('is a running event when event.type is an array of strings and contains start', () => {
      let event: SafeResolverEvent = generator.generateEvent({
        eventType: ['bogus', 'start', 'creation'],
      });
      expect(isProcessRunning(event)).toBeTruthy();

      event = generator.generateEvent({
        eventType: ['start', 'bogus'],
      });
      expect(isProcessRunning(event)).toBeTruthy();
    });

    it('is not a running event when event.type is only and end type', () => {
      const event: SafeResolverEvent = generator.generateEvent({
        eventType: ['end'],
      });
      expect(isProcessRunning(event)).toBeFalsy();
    });

    it('is not a running event when event.type is empty', () => {
      const event: SafeResolverEvent = generator.generateEvent({
        eventType: [],
      });
      expect(isProcessRunning(event)).toBeFalsy();
    });

    it('is not a running event when event.type is bogus', () => {
      const event: SafeResolverEvent = generator.generateEvent({
        eventType: ['bogus'],
      });
      expect(isProcessRunning(event)).toBeFalsy();
    });

    it('is a running event when event.type contains info', () => {
      const event: SafeResolverEvent = generator.generateEvent({
        eventType: ['info'],
      });
      expect(isProcessRunning(event)).toBeTruthy();
    });

    it('is a running event when event.type contains change', () => {
      const event: SafeResolverEvent = generator.generateEvent({
        eventType: ['bogus', 'change'],
      });
      expect(isProcessRunning(event)).toBeTruthy();
    });
  });
});
