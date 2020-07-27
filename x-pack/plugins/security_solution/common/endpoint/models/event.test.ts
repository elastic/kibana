/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EndpointDocGenerator } from '../generate_data';
import { descriptiveName, isStart } from './event';
import { ResolverEvent } from '../types';

describe('Generated documents', () => {
  let generator: EndpointDocGenerator;
  beforeEach(() => {
    generator = new EndpointDocGenerator('seed');
  });

  describe('Event descriptive names', () => {
    it('returns the right name for a registry event', () => {
      const extensions = { registry: { key: `HKLM/Windows/Software/abc` } };
      const event = generator.generateEvent({ eventCategory: 'registry', extensions });
      expect(descriptiveName(event)).toEqual({ subject: `HKLM/Windows/Software/abc` });
    });

    it('returns the right name for a network event', () => {
      const randomIP = `${generator.randomIP()}`;
      const extensions = { network: { direction: 'outbound', forwarded_ip: randomIP } };
      const event = generator.generateEvent({ eventCategory: 'network', extensions });
      expect(descriptiveName(event)).toEqual({ subject: `${randomIP}`, descriptor: 'outbound' });
    });

    it('returns the right name for a file event', () => {
      const extensions = { file: { path: 'C:\\My Documents\\business\\January\\processName' } };
      const event = generator.generateEvent({ eventCategory: 'file', extensions });
      expect(descriptiveName(event)).toEqual({
        subject: 'C:\\My Documents\\business\\January\\processName',
      });
    });

    it('returns the right name for a dns event', () => {
      const extensions = { dns: { question: { name: `${generator.randomIP()}` } } };
      const event = generator.generateEvent({ eventCategory: 'dns', extensions });
      expect(descriptiveName(event)).toEqual({ subject: extensions.dns.question.name });
    });
  });

  describe('Start events', () => {
    it('is a start event when event.type is a string', () => {
      const event: ResolverEvent = generator.generateEvent({
        eventType: 'start',
      });
      expect(isStart(event)).toBeTruthy();
    });

    it('is a start event when event.type is an array of strings', () => {
      const event: ResolverEvent = generator.generateEvent({
        eventType: ['start'],
      });
      expect(isStart(event)).toBeTruthy();
    });

    it('is a start event when event.type is an array of strings and contains start', () => {
      let event: ResolverEvent = generator.generateEvent({
        eventType: ['bogus', 'start', 'creation'],
      });
      expect(isStart(event)).toBeTruthy();

      event = generator.generateEvent({
        eventType: ['start', 'bogus'],
      });
      expect(isStart(event)).toBeTruthy();
    });

    it('is not a start event when event.type is not start', () => {
      const event: ResolverEvent = generator.generateEvent({
        eventType: ['end'],
      });
      expect(isStart(event)).toBeFalsy();
    });

    it('is not a start event when event.type is empty', () => {
      const event: ResolverEvent = generator.generateEvent({
        eventType: [],
      });
      expect(isStart(event)).toBeFalsy();
    });

    it('is not a start event when event.type is bogus', () => {
      const event: ResolverEvent = generator.generateEvent({
        eventType: ['bogus'],
      });
      expect(isStart(event)).toBeFalsy();
    });
  });
});
