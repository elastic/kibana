/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import seedrandom from 'seedrandom';
import {
  AlertEvent,
  EndpointEvent,
  Host,
  HostMetadata,
  HostOS,
  PolicyData,
  HostPolicyResponse,
  HostPolicyResponseActionStatus,
} from './types';
import { factory as policyFactory } from './models/policy_config';

export type Event = AlertEvent | EndpointEvent;

interface EventOptions {
  timestamp?: number;
  entityID?: string;
  parentEntityID?: string;
  eventType?: string;
  eventCategory?: string;
  processName?: string;
}

const Windows: HostOS[] = [
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

const Linux: HostOS[] = [];

const Mac: HostOS[] = [];

const OS: HostOS[] = [...Windows, ...Mac, ...Linux];

const POLICIES: Array<{ name: string; id: string }> = [
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

interface EventInfo {
  category: string;
  /**
   * This denotes the `event.type` field for when an event is created, this can be `start` or `creation`
   */
  creationType: string;
}

// These are from the v1 schemas and aren't all valid ECS event categories, still in flux
const OTHER_EVENT_CATEGORIES: EventInfo[] = [
  { category: 'driver', creationType: 'start' },
  { category: 'file', creationType: 'creation' },
  { category: 'library', creationType: 'start' },
  { category: 'network', creationType: 'start' },
  { category: 'registry', creationType: 'creation' },
];

interface HostInfo {
  elastic: {
    agent: {
      id: string;
    };
  };
  agent: {
    version: string;
    id: string;
  };
  host: Host;
  endpoint: {
    policy: {
      id: string;
    };
  };
}

interface NodeState {
  event: Event;
  childrenCreated: number;
  maxChildren: number;
}

export class EndpointDocGenerator {
  commonInfo: HostInfo;
  random: seedrandom.prng;

  constructor(seed: string | seedrandom.prng = Math.random().toString()) {
    if (typeof seed === 'string') {
      this.random = seedrandom(seed);
    } else {
      this.random = seed;
    }
    this.commonInfo = this.createHostData();
  }

  /**
   * Creates new random IP addresses for the host to simulate new DHCP assignment
   */
  public updateHostData() {
    this.commonInfo.host.ip = this.randomArray(3, () => this.randomIP());
  }

  private createHostData(): HostInfo {
    return {
      agent: {
        version: this.randomVersion(),
        id: this.seededUUIDv4(),
      },
      elastic: {
        agent: {
          id: this.seededUUIDv4(),
        },
      },
      host: {
        id: this.seededUUIDv4(),
        hostname: this.randomHostname(),
        ip: this.randomArray(3, () => this.randomIP()),
        mac: this.randomArray(3, () => this.randomMac()),
        os: this.randomChoice(OS),
      },
      endpoint: {
        policy: this.randomChoice(POLICIES),
      },
    };
  }

  /**
   * Creates a host metadata document
   * @param ts - Timestamp to put in the event
   */
  public generateHostMetadata(ts = new Date().getTime()): HostMetadata {
    return {
      '@timestamp': ts,
      event: {
        created: ts,
      },
      ...this.commonInfo,
    };
  }

  /**
   * Creates an alert from the simulated host represented by this EndpointDocGenerator
   * @param ts - Timestamp to put in the event
   * @param entityID - entityID of the originating process
   * @param parentEntityID - optional entityID of the parent process, if it exists
   */
  public generateAlert(
    ts = new Date().getTime(),
    entityID = this.randomString(10),
    parentEntityID?: string
  ): AlertEvent {
    return {
      ...this.commonInfo,
      '@timestamp': ts,
      event: {
        action: this.randomChoice(FILE_OPERATIONS),
        kind: 'alert',
        category: 'malware',
        id: this.seededUUIDv4(),
        dataset: 'endpoint',
        module: 'endpoint',
        type: 'creation',
      },
      file: {
        owner: 'SYSTEM',
        name: 'fake_malware.exe',
        path: 'C:/fake_malware.exe',
        accessed: ts,
        mtime: ts,
        created: ts,
        size: 3456,
        hash: {
          md5: 'fake file md5',
          sha1: 'fake file sha1',
          sha256: 'fake file sha256',
        },
        code_signature: {
          trusted: false,
          subject_name: 'bad signer',
        },
        malware_classification: {
          identifier: 'endpointpe',
          score: 1,
          threshold: 0.66,
          version: '3.0.33',
        },
        temp_file_path: 'C:/temp/fake_malware.exe',
      },
      process: {
        pid: 2,
        name: 'malware writer',
        start: ts,
        uptime: 0,
        user: 'SYSTEM',
        entity_id: entityID,
        executable: 'C:/malware.exe',
        parent: parentEntityID ? { entity_id: parentEntityID, pid: 1 } : undefined,
        token: {
          domain: 'NT AUTHORITY',
          integrity_level: 16384,
          integrity_level_name: 'system',
          privileges: [
            {
              description: 'Replace a process level token',
              enabled: false,
              name: 'SeAssignPrimaryTokenPrivilege',
            },
          ],
          sid: 'S-1-5-18',
          type: 'tokenPrimary',
          user: 'SYSTEM',
        },
        code_signature: {
          trusted: false,
          subject_name: 'bad signer',
        },
        hash: {
          md5: 'fake md5',
          sha1: 'fake sha1',
          sha256: 'fake sha256',
        },
      },
      dll: [
        {
          pe: {
            architecture: 'x64',
            imphash: 'c30d230b81c734e82e86e2e2fe01cd01',
          },
          code_signature: {
            subject_name: 'Cybereason Inc',
            trusted: true,
          },
          compile_time: 1534424710,
          hash: {
            md5: '1f2d082566b0fc5f2c238a5180db7451',
            sha1: 'ca85243c0af6a6471bdaa560685c51eefd6dbc0d',
            sha256: '8ad40c90a611d36eb8f9eb24fa04f7dbca713db383ff55a03aa0f382e92061a2',
          },
          malware_classification: {
            identifier: 'Whitelisted',
            score: 0,
            threshold: 0,
            version: '3.0.0',
          },
          mapped_address: 5362483200,
          mapped_size: 0,
          path: 'C:\\Program Files\\Cybereason ActiveProbe\\AmSvc.exe',
        },
      ],
    };
  }

  /**
   * Creates an event, customized by the options parameter
   * @param options - Allows event field values to be specified
   */
  public generateEvent(options: EventOptions = {}): EndpointEvent {
    return {
      '@timestamp': options.timestamp ? options.timestamp : new Date().getTime(),
      agent: { ...this.commonInfo.agent, type: 'endpoint' },
      ecs: {
        version: '1.4.0',
      },
      event: {
        category: options.eventCategory ? options.eventCategory : 'process',
        kind: 'event',
        type: options.eventType ? options.eventType : 'start',
        id: this.seededUUIDv4(),
      },
      host: this.commonInfo.host,
      process: {
        entity_id: options.entityID ? options.entityID : this.randomString(10),
        parent: options.parentEntityID ? { entity_id: options.parentEntityID } : undefined,
        name: options.processName ? options.processName : randomProcessName(),
      },
    };
  }

  /**
   * Generator function that creates the full set of events needed to render resolver.
   * The number of nodes grows exponentially with the number of generations and children per node.
   * Each node is logically a process, and will have 1 or more process events associated with it.
   * @param alertAncestors - number of ancestor generations to create relative to the alert
   * @param childGenerations - number of child generations to create relative to the alert
   * @param maxChildrenPerNode - maximum number of children for any given node in the tree
   * @param relatedEventsPerNode - number of related events (file, registry, etc) to create for each process event in the tree
   * @param percentNodesWithRelated - percent of nodes which should have related events
   * @param percentChildrenTerminated - percent of nodes which will have process termination events
   */
  public *fullResolverTreeGenerator(
    alertAncestors?: number,
    childGenerations?: number,
    maxChildrenPerNode?: number,
    relatedEventsPerNode?: number,
    percentNodesWithRelated?: number,
    percentChildrenTerminated?: number
  ) {
    const ancestry = this.createAlertEventAncestry(alertAncestors);
    for (let i = 0; i < ancestry.length; i++) {
      yield ancestry[i];
    }
    // ancestry will always have at least 2 elements, and the second to last element will be the process associated with the alert
    yield* this.descendantsTreeGenerator(
      ancestry[ancestry.length - 2],
      childGenerations,
      maxChildrenPerNode,
      relatedEventsPerNode,
      percentNodesWithRelated,
      percentChildrenTerminated
    );
  }

  /**
   * Creates an alert event and associated process ancestry. The alert event will always be the last event in the return array.
   * @param alertAncestors - number of ancestor generations to create
   */
  public createAlertEventAncestry(alertAncestors = 3): Event[] {
    const events = [];
    const startDate = new Date().getTime();
    const root = this.generateEvent({ timestamp: startDate + 1000 });
    events.push(root);
    let ancestor = root;
    for (let i = 0; i < alertAncestors; i++) {
      ancestor = this.generateEvent({
        timestamp: startDate + 1000 * (i + 1),
        parentEntityID: ancestor.process.entity_id,
      });
      events.push(ancestor);
    }
    events.push(
      this.generateAlert(
        startDate + 1000 * alertAncestors,
        ancestor.process.entity_id,
        ancestor.process.parent?.entity_id
      )
    );
    return events;
  }

  /**
   * Creates the child generations of a process.  The number of returned events grows exponentially with generations and maxChildrenPerNode.
   * @param root - The process event to use as the root node of the tree
   * @param generations - number of child generations to create. The root node is not counted as a generation.
   * @param maxChildrenPerNode - maximum number of children for any given node in the tree
   * @param relatedEventsPerNode - number of related events (file, registry, etc) to create for each process event in the tree
   * @param percentNodesWithRelated - percent of nodes which should have related events
   * @param percentChildrenTerminated - percent of nodes which will have process termination events
   */
  public *descendantsTreeGenerator(
    root: Event,
    generations = 2,
    maxChildrenPerNode = 2,
    relatedEventsPerNode = 3,
    percentNodesWithRelated = 100,
    percentChildrenTerminated = 100
  ) {
    const rootState: NodeState = {
      event: root,
      childrenCreated: 0,
      maxChildren: this.randomN(maxChildrenPerNode + 1),
    };
    const lineage: NodeState[] = [rootState];
    let timestamp = root['@timestamp'];
    while (lineage.length > 0) {
      const currentState = lineage[lineage.length - 1];
      // If we get to a state node and it has made all the children, move back up a level
      if (
        currentState.childrenCreated === currentState.maxChildren ||
        lineage.length === generations + 1
      ) {
        lineage.pop();
        continue;
      }
      // Otherwise, add a child and any nodes associated with it
      currentState.childrenCreated++;
      timestamp = timestamp + 1000;
      const child = this.generateEvent({
        timestamp,
        parentEntityID: currentState.event.process.entity_id,
      });
      lineage.push({
        event: child,
        childrenCreated: 0,
        maxChildren: this.randomN(maxChildrenPerNode + 1),
      });
      yield child;
      let processDuration: number = 6 * 3600;
      if (this.randomN(100) < percentChildrenTerminated) {
        processDuration = this.randomN(1000000); // This lets termination events be up to 1 million seconds after the creation event (~11 days)
        yield this.generateEvent({
          timestamp: timestamp + processDuration * 1000,
          entityID: child.process.entity_id,
          parentEntityID: child.process.parent?.entity_id,
          eventCategory: 'process',
          eventType: 'end',
        });
      }
      if (this.randomN(100) < percentNodesWithRelated) {
        yield* this.relatedEventsGenerator(child, relatedEventsPerNode, processDuration);
      }
    }
  }

  /**
   * Creates related events for a process event
   * @param node - process event to relate events to by entityID
   * @param numRelatedEvents - number of related events to generate
   * @param processDuration - maximum number of seconds after process event that related event timestamp can be
   */
  public *relatedEventsGenerator(
    node: Event,
    numRelatedEvents = 10,
    processDuration: number = 6 * 3600
  ) {
    for (let i = 0; i < numRelatedEvents; i++) {
      const eventInfo = this.randomChoice(OTHER_EVENT_CATEGORIES);

      const ts = node['@timestamp'] + this.randomN(processDuration) * 1000;
      yield this.generateEvent({
        timestamp: ts,
        entityID: node.process.entity_id,
        parentEntityID: node.process.parent?.entity_id,
        eventCategory: eventInfo.category,
        eventType: eventInfo.creationType,
      });
    }
  }

  /**
   * Generates an Ingest `datasource` that includes the Endpoint Policy data
   */
  public generatePolicyDatasource(): PolicyData {
    return {
      id: this.seededUUIDv4(),
      name: 'Endpoint Policy',
      description: 'Policy to protect the worlds data',
      config_id: this.seededUUIDv4(),
      enabled: true,
      output_id: '',
      inputs: [
        {
          type: 'endpoint',
          enabled: true,
          streams: [],
          config: {
            policy: {
              value: policyFactory(),
            },
          },
        },
      ],
      namespace: 'default',
      package: {
        name: 'endpoint',
        title: 'Elastic Endpoint',
        version: '1.0.0',
      },
      revision: 1,
    };
  }

  /**
   * Generates a Host Policy response message
   */
  generatePolicyResponse(): HostPolicyResponse {
    return {
      '@timestamp': new Date().toISOString(),
      elastic: {
        agent: {
          id: 'c2a9093e-e289-4c0a-aa44-8c32a414fa7a',
        },
      },
      ecs: {
        version: '1.0.0',
      },
      event: {
        created: '2015-01-01T12:10:30Z',
        kind: 'policy_response',
      },
      agent: {
        version: '6.0.0-rc2',
        id: '8a4f500d',
      },
      endpoint: {
        artifacts: {
          'global-manifest': {
            version: '1.2.3',
            sha256: 'abcdef',
          },
          'endpointpe-v4-windows': {
            version: '1.2.3',
            sha256: 'abcdef',
          },
          'user-whitelist-windows': {
            version: '1.2.3',
            sha256: 'abcdef',
          },
          'global-whitelist-windows': {
            version: '1.2.3',
            sha256: 'abcdef',
          },
        },
        policy: {
          applied: {
            version: '1.0.0',
            id: '17d4b81d-9940-4b64-9de5-3e03ef1fb5cf',
            status: HostPolicyResponseActionStatus.success,
            response: {
              configurations: {
                malware: {
                  status: HostPolicyResponseActionStatus.success,
                  concerned_actions: ['download_model', 'workflow', 'a_custom_future_action'],
                },
                events: {
                  status: HostPolicyResponseActionStatus.success,
                  concerned_actions: ['ingest_events_config', 'workflow'],
                },
                logging: {
                  status: HostPolicyResponseActionStatus.success,
                  concerned_actions: ['configure_elasticsearch_connection'],
                },
                streaming: {
                  status: HostPolicyResponseActionStatus.success,
                  concerned_actions: [
                    'detect_file_open_events',
                    'download_global_artifacts',
                    'a_custom_future_action',
                  ],
                },
              },
              actions: {
                download_model: {
                  status: HostPolicyResponseActionStatus.success,
                  message: 'model downloaded',
                },
                ingest_events_config: {
                  status: HostPolicyResponseActionStatus.success,
                  message: 'no action taken',
                },
                workflow: {
                  status: HostPolicyResponseActionStatus.success,
                  message: 'the flow worked well',
                },
                a_custom_future_action: {
                  status: HostPolicyResponseActionStatus.success,
                  message: 'future message',
                },
                configure_elasticsearch_connection: {
                  status: HostPolicyResponseActionStatus.success,
                  message: 'some message',
                },
                detect_file_open_events: {
                  status: HostPolicyResponseActionStatus.success,
                  message: 'some message',
                },
                download_global_artifacts: {
                  status: HostPolicyResponseActionStatus.success,
                  message: 'some message',
                },
              },
            },
          },
        },
      },
    };
  }

  private randomN(n: number): number {
    return Math.floor(this.random() * n);
  }

  private *randomNGenerator(max: number, count: number) {
    while (count > 0) {
      yield this.randomN(max);
      count--;
    }
  }

  private randomArray<T>(lengthLimit: number, generator: () => T): T[] {
    const rand = this.randomN(lengthLimit) + 1;
    return [...Array(rand).keys()].map(generator);
  }

  private randomMac(): string {
    return [...this.randomNGenerator(255, 6)].map(x => x.toString(16)).join('-');
  }

  private randomIP(): string {
    return [10, ...this.randomNGenerator(255, 3)].map(x => x.toString()).join('.');
  }

  private randomVersion(): string {
    return [6, ...this.randomNGenerator(10, 2)].map(x => x.toString()).join('.');
  }

  private randomChoice<T>(choices: T[]): T {
    return choices[this.randomN(choices.length)];
  }

  private randomString(length: number): string {
    return [...this.randomNGenerator(36, length)].map(x => x.toString(36)).join('');
  }

  private randomHostname(): string {
    return `Host-${this.randomString(10)}`;
  }

  private seededUUIDv4(): string {
    return uuid.v4({ random: [...this.randomNGenerator(255, 16)] });
  }
}

const fakeProcessNames = [
  'lsass.exe',
  'notepad.exe',
  'mimikatz.exe',
  'powershell.exe',
  'iexlorer.exe',
  'explorer.exe',
];
/** Return a random fake process name */
function randomProcessName(): string {
  return fakeProcessNames[Math.floor(Math.random() * fakeProcessNames.length)];
}
