/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EndpointDocGenerator, generateResolverEvents } from './generate_data';

describe('data generator', () => {
  let generator: EndpointDocGenerator;
  beforeEach(() => {
    generator = new EndpointDocGenerator();
  });

  it('creates endpoint metadata documents', () => {
    const timestamp = new Date();
    const metadata = generator.generateEndpointMetadata(timestamp);
    expect(metadata['@timestamp']).toEqual(timestamp);
    expect(metadata.event.created).toEqual(timestamp);
    expect(metadata.endpoint).not.toBeNull();
    expect(metadata.agent).not.toBeNull();
    expect(metadata.host).not.toBeNull();
  });

  it('creates alert event documents', () => {
    const timestamp = new Date();
    const alert = generator.generateAlert(timestamp);
    expect(alert['@timestamp']).toEqual(timestamp);
    expect(alert.event.action).not.toBeNull();
    expect(alert.endpoint).not.toBeNull();
    expect(alert.agent).not.toBeNull();
    expect(alert.host).not.toBeNull();
    expect(alert.process.entity_id).not.toBeNull();
  });

  it('creates process event documents', () => {
    const timestamp = new Date();
    const processEvent = generator.generateEvent(timestamp);
    expect(processEvent['@timestamp']).toEqual(timestamp);
    expect(processEvent.event.category).toEqual('process');
    expect(processEvent.event.kind).toEqual('event');
    expect(processEvent.event.type).toEqual('creation');
    expect(processEvent.agent).not.toBeNull();
    expect(processEvent.host).not.toBeNull();
    expect(processEvent.process.entity_id).not.toBeNull();
  });

  it('creates other event documents', () => {
    const timestamp = new Date();
    const processEvent = generator.generateEvent(timestamp, undefined, undefined, 'dns');
    expect(processEvent['@timestamp']).toEqual(timestamp);
    expect(processEvent.event.category).toEqual('dns');
    expect(processEvent.event.kind).toEqual('event');
    expect(processEvent.event.type).toEqual('creation');
    expect(processEvent.agent).not.toBeNull();
    expect(processEvent.host).not.toBeNull();
    expect(processEvent.process.entity_id).not.toBeNull();
  });

  it('creates alert ancestor tree', () => {
    const events = generateResolverEvents(generator, 3);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].process.parent?.entity_id).toEqual(events[i - 1].process.entity_id);
      if (i < events.length - 1) {
        expect(events[i].event.kind).toEqual('event');
        expect(events[i].event.category).toEqual('process');
      }
    }
    expect(events[events.length - 1].event.kind).toEqual('alert');
    expect(events[events.length - 1].event.category).toEqual('malware');
  });
});
