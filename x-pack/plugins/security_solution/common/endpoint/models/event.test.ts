/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EndpointDocGenerator } from '../generate_data';
import { descriptiveName } from './event';

describe('Event descriptive names', () => {
  let generator: EndpointDocGenerator;
  beforeEach(() => {
    generator = new EndpointDocGenerator('seed');
  });

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
