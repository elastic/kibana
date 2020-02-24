/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertData, EndpointEvent, EndpointMetadata } from './types';
import uuid from 'uuid';

const Windows: { name: string, full: string, version: string, variant: string }[] = [
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

const Linux: { name: string, full: string, version: string, variant: string }[] = [];

const Mac: { name: string, full: string, version: string, variant: string }[] = [];

const OS: { name: string, full: string, version: string, variant: string }[] = [
  ...Windows,
  ...Mac,
  ...Linux,
];

const POLICIES: { name: string, id: string }[] = [
  // mapping name and ID as a sperate attribute makes query more complicated
  // perhaps, combine them into a single field such that
  // policy.namd_id = 'Default:C2A9093E-E289-4C0A-AA44-8C32A414FA7A'
  {
      name: 'Default',
      id: '00000000-0000-0000-0000-000000000000'
  },
  {
      name: 'With Eventing',
      id: 'C2A9093E-E289-4C0A-AA44-8C32A414FA7A'
  },
];

const FILE_OPERATIONS: string[] = ['creation', 'open', 'rename', 'execution', 'deletion']

function randomN(n: number): number {
  return Math.floor((Math.random() * n))
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

class EndpointDocGenerator {
  agentId: string;
  agentName: string;
  hostId: string;
  hostname: string;
  lastDHCPLeaseAt: Date;
  macAddress: string[];
  ip: string[];
  agentVersion: string;
  os: { name: string, full: string, version: string, variant: string };
  policy: { name: string, id: string };

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
      this.policy = randomChoice(POLICIES)
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
                  id: this.policy.id
              },
          },
          agent: {
              version: this.agentVersion,
              id: this.agentId,
              name: this.agentName
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

  generateAlert(ts: Date, parentEntityID?: string): AlertData {
    return {
      '@timestamp': ts,
      agent: {
        id: this.agentId,
        name: this.agentName,
        version: this.agentVersion
      },
      event: {
        action: randomChoice(FILE_OPERATIONS)
      },
      endpoint: {
        policy: {
          id: this.policy.id
        }
      },
      file_classification: {
        malware_classification: {
          score: Math.random()
        }
      },
      host: {
        id: this.hostId,
        hostname: this.hostname,
        ip: this.ip,
        mac: this.macAddress,
        os: this.os
      },
      process: {
        entity_id: randomString(100),
        parent: {
          entity_id: parentEntityID ? parentEntityID : undefined
        }
      },
      thread: {}
    }
  }

  generateEvent(ts: Date, eventCategory?: string, eventType?: string, parentEntityID?: string): EndpointEvent {
    return {
      '@timestamp': ts,
      agent: {
        id: this.agentId,
        name: this.agentName,
        version: this.agentVersion
      },
      ecs: {
        version: '1.4.0'
      },
      event: {
        category: eventCategory ? eventCategory : 'process',
        kind: 'event',
        type: eventType ? eventType : 'creation',
        id: uuid.v4()
      },
      host: {
        id: this.hostId,
        hostname: this.hostname,
        ip: this.ip,
        mac: this.macAddress,
        os: this.os
      },
      process: {
        entity_id: randomString(100),
        parent: {
          entity_id: parentEntityID ? parentEntityID : undefined
        }
      },
    }
  }
}