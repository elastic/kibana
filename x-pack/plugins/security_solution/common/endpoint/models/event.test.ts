/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EndpointDocGenerator } from '../generate_data';
import { descriptiveName, isProcessRunning } from './event';
import { ResolverEvent, SafeResolverEvent } from '../types';

describe('Generated documents', () => {
  let generator: EndpointDocGenerator;
  beforeEach(() => {
    generator = new EndpointDocGenerator('seed');
  });

  describe('Event descriptive names', () => {
    it('returns the right name for a registry event', () => {
      const extensions = { registry: { key: `HKLM/Windows/Software/abc` } };
      const event = generator.generateEvent({ eventCategory: 'registry', extensions });
      // casting to ResolverEvent here because the `descriptiveName` function is used by the frontend is still relies
      // on the unsafe ResolverEvent type. Once it's switched over to the safe version we can remove this cast.
      expect(descriptiveName(event as ResolverEvent)).toEqual({
        subject: `HKLM/Windows/Software/abc`,
      });
    });

    it('returns the right name for a network event', () => {
      const randomIP = `${generator.randomIP()}`;
      const extensions = { network: { direction: 'outbound', forwarded_ip: randomIP } };
      const event = generator.generateEvent({ eventCategory: 'network', extensions });
      // casting to ResolverEvent here because the `descriptiveName` function is used by the frontend is still relies
      // on the unsafe ResolverEvent type. Once it's switched over to the safe version we can remove this cast.
      expect(descriptiveName(event as ResolverEvent)).toEqual({
        subject: `${randomIP}`,
        descriptor: 'outbound',
      });
    });

    it('returns the right name for a file event', () => {
      const extensions = { file: { path: 'C:\\My Documents\\business\\January\\processName' } };
      const event = generator.generateEvent({ eventCategory: 'file', extensions });
      // casting to ResolverEvent here because the `descriptiveName` function is used by the frontend is still relies
      // on the unsafe ResolverEvent type. Once it's switched over to the safe version we can remove this cast.
      expect(descriptiveName(event as ResolverEvent)).toEqual({
        subject: 'C:\\My Documents\\business\\January\\processName',
      });
    });

    it('returns the right name for a dns event', () => {
      const extensions = { dns: { question: { name: `${generator.randomIP()}` } } };
      const event = generator.generateEvent({ eventCategory: 'dns', extensions });
      // casting to ResolverEvent here because the `descriptiveName` function is used by the frontend is still relies
      // on the unsafe ResolverEvent type. Once it's switched over to the safe version we can remove this cast.
      expect(descriptiveName(event as ResolverEvent)).toEqual({
        subject: extensions.dns.question.name,
      });
    });
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
