/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { AlertEvent, EndpointEvent, EndpointMetadata, OSFields } from './types';

const Windows: OSFields[] = [
  {
    name: 'windows 10.0',
    full: 'Windows 10',
    version: '10.0',
    variant: 'Windows Pro',
  },
  {
    name: 'windows 10.0',
    full: 'Windows Server 2016',
    version: '10.0',
    variant: 'Windows Server',
  },
  {
    name: 'windows 6.2',
    full: 'Windows Server 2012',
    version: '6.2',
    variant: 'Windows Server',
  },
  {
    name: 'windows 6.3',
    full: 'Windows Server 2012R2',
    version: '6.3',
    variant: 'Windows Server Release 2',
  },
];

const Linux: OSFields[] = [];

const Mac: OSFields[] = [];

const OS: OSFields[] = [...Windows, ...Mac, ...Linux];

const POLICIES: Array<{ name: string; id: string }> = [
  // mapping name and ID as a sperate attribute makes query more complicated
  // perhaps, combine them into a single field such that
  // policy.namd_id = 'Default:C2A9093E-E289-4C0A-AA44-8C32A414FA7A'
  {
    name: 'Default',
    id: '00000000-0000-0000-0000-000000000000',
  },
  {
    name: 'With Eventing',
    id: 'C2A9093E-E289-4C0A-AA44-8C32A414FA7A',
  },
];

const FILE_OPERATIONS: string[] = ['creation', 'open', 'rename', 'execution', 'deletion'];

// These are from the v1 schemas and aren't all valid ECS event categories, still in flux
const OTHER_EVENT_CATEGORIES: string[] = ['driver', 'file', 'library', 'network', 'registry'];

function randomN(n: number): number {
  return Math.floor(Math.random() * n);
}

function* randomNGenerator(max: number, count: number) {
  while (count > 0) {
    yield randomN(max);
    count--;
  }
}

function randomArray<T>(lenghtLimit: number, generator: () => T): T[] {
  const rand = randomN(lenghtLimit) + 1;
  return [...Array(rand).keys()].map(generator);
}

function randomMac(): string {
  return [...randomNGenerator(255, 6)].map(x => x.toString(16)).join('-');
}

function randomIP(): string {
  return [10, ...randomNGenerator(255, 3)].map(x => x.toString()).join('.');
}

function randomVersion(): string {
  return [6, ...randomNGenerator(10, 2)].map(x => x.toString()).join('.');
}

function randomChoice<T>(arg: T[]): T {
  return arg[randomN(arg.length)];
}

function randomString(length: number): string {
  return [...randomNGenerator(36, length)].map(x => x.toString()).join('');
}

function randomHostname(): string {
  return `Host-${randomString(10)}`;
}

export function generateRelatedEvents(
  node: EndpointEvent,
  generator: EndpointDocGenerator,
  numRelatedEvents = 10
): EndpointEvent[] {
  const ts = new Date(node['@timestamp'].getTime() + 1000);
  const relatedEvents: EndpointEvent[] = [];
  for (let i = 0; i < numRelatedEvents; i++) {
    relatedEvents.push(
      generator.generateEvent(
        ts,
        node.process.entity_id,
        node.process.parent?.entity_id,
        randomChoice(OTHER_EVENT_CATEGORIES)
      )
    );
  }
  return relatedEvents;
}

export function generateResolverTree(
  root: EndpointEvent,
  generator: EndpointDocGenerator,
  generations = 2,
  maxChildrenPerNode = 2,
  relatedEventsPerNode = 3,
  percentNodesWithRelated = 100,
  percentChildrenTerminated = 100
): EndpointEvent[] {
  let events: EndpointEvent[] = [root];
  let parents = [root];
  let timestamp = root['@timestamp'];
  for (let i = 0; i < generations; i++) {
    const newParents: EndpointEvent[] = [];
    parents.forEach(element => {
      // const numChildren = randomN(maxChildrenPerNode);
      const numChildren = maxChildrenPerNode;
      for (let j = 0; j < numChildren; j++) {
        timestamp = new Date(timestamp.getTime() + 1000);
        const child = generator.generateEvent(timestamp, undefined, element.process.entity_id);
        newParents.push(child);
      }
    });
    events = events.concat(newParents);
    parents = newParents;
  }
  const terminationEvents: EndpointEvent[] = [];
  let relatedEvents: EndpointEvent[] = [];
  events.forEach(element => {
    if (randomN(100) < percentChildrenTerminated) {
      timestamp = new Date(timestamp.getTime() + 1000);
      terminationEvents.push(
        generator.generateEvent(
          timestamp,
          element.process.entity_id,
          element.process.parent?.entity_id,
          'process',
          'end'
        )
      );
    }
    if (randomN(100) < percentNodesWithRelated) {
      relatedEvents = relatedEvents.concat(
        generateRelatedEvents(element, generator, relatedEventsPerNode)
      );
    }
  });
  events = events.concat(terminationEvents);
  events = events.concat(relatedEvents);
  return events;
}

export function generateEventAncestry(
  generator: EndpointDocGenerator,
  alertAncestors = 3
): Array<AlertEvent | EndpointEvent> {
  const events = [];
  const startDate = new Date();
  const root = generator.generateEvent(new Date(startDate.getTime() + 1000));
  events.push(root);
  let ancestor = root;
  for (let i = 0; i < alertAncestors; i++) {
    ancestor = generator.generateEvent(
      new Date(startDate.getTime() + 1000 * (i + 1)),
      undefined,
      ancestor.process.entity_id
    );
    events.push(ancestor);
  }
  events.push(
    generator.generateAlert(
      new Date(startDate.getTime() + 1000 * alertAncestors),
      ancestor.process.entity_id,
      ancestor.process.parent?.entity_id
    )
  );
  return events;
}

export class EndpointDocGenerator {
  agentId: string;
  agentName: string;
  hostId: string;
  hostname: string;
  lastDHCPLeaseAt: Date;
  macAddress: string[];
  ip: string[];
  agentVersion: string;
  os: OSFields;
  policy: { name: string; id: string };

  constructor() {
    this.hostId = uuid.v4();
    this.agentId = uuid.v4();
    this.agentName = 'Elastic Endpoint';
    this.hostname = randomHostname();
    this.lastDHCPLeaseAt = new Date();
    this.ip = randomArray(3, () => randomIP());
    this.macAddress = randomArray(3, () => randomMac());
    this.agentVersion = randomVersion();
    this.os = randomChoice(OS);
    this.policy = randomChoice(POLICIES);
  }

  generateEndpointMetadata(ts: Date): EndpointMetadata {
    if (Math.abs(ts.getTime() - this.lastDHCPLeaseAt.getTime()) > 3600 * 12 * 1000) {
      this.lastDHCPLeaseAt = ts;
      this.ip = randomArray(3, () => randomIP());
    }
    return {
      '@timestamp': ts,
      event: {
        created: ts,
      },
      endpoint: {
        policy: {
          id: this.policy.id,
        },
      },
      agent: {
        version: this.agentVersion,
        id: this.agentId,
        name: this.agentName,
      },
      host: {
        id: this.hostId,
        hostname: this.hostname,
        ip: this.ip,
        mac: this.macAddress,
        os: this.os,
      },
    };
  }

  generateAlert(ts: Date, entityID?: string, parentEntityID?: string): AlertEvent {
    return {
      '@timestamp': ts,
      agent: {
        id: this.agentId,
        name: this.agentName,
        version: this.agentVersion,
      },
      event: {
        action: randomChoice(FILE_OPERATIONS),
        kind: 'alert',
        category: 'malware',
        id: uuid.v4(),
      },
      endpoint: {
        policy: {
          id: this.policy.id,
        },
      },
      file: {
        malware_classifier: {
          score: Math.random(),
        },
      },
      host: {
        id: this.hostId,
        hostname: this.hostname,
        ip: this.ip,
        mac: this.macAddress,
        os: this.os,
      },
      process: {
        entity_id: entityID ? entityID : randomString(10),
        parent: parentEntityID ? { entity_id: parentEntityID } : undefined,
      },
    };
  }

  generateEvent(
    ts: Date,
    entityID?: string,
    parentEntityID?: string,
    eventCategory?: string,
    eventType?: string
  ): EndpointEvent {
    return {
      '@timestamp': ts,
      agent: {
        id: this.agentId,
        name: this.agentName,
        version: this.agentVersion,
      },
      ecs: {
        version: '1.4.0',
      },
      event: {
        category: eventCategory ? eventCategory : 'process',
        kind: 'event',
        type: eventType ? eventType : 'creation',
        id: uuid.v4(),
      },
      host: {
        id: this.hostId,
        hostname: this.hostname,
        ip: this.ip,
        mac: this.macAddress,
        os: this.os,
      },
      process: {
        entity_id: entityID ? entityID : randomString(10),
        parent: parentEntityID ? { entity_id: parentEntityID } : undefined,
      },
    };
  }
}
