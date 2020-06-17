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
  HostPolicyResponse,
  HostPolicyResponseActionStatus,
  PolicyData,
} from './types';
import { factory as policyFactory } from './models/policy_config';

export type Event = AlertEvent | EndpointEvent;

interface EventOptions {
  timestamp?: number;
  entityID?: string;
  parentEntityID?: string;
  eventType?: string;
  eventCategory?: string | string[];
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

const APPLIED_POLICIES: Array<{
  name: string;
  id: string;
  status: HostPolicyResponseActionStatus;
}> = [
  {
    name: 'Default',
    id: '00000000-0000-0000-0000-000000000000',
    status: HostPolicyResponseActionStatus.success,
  },
  {
    name: 'With Eventing',
    id: 'C2A9093E-E289-4C0A-AA44-8C32A414FA7A',
    status: HostPolicyResponseActionStatus.success,
  },
];

const FILE_OPERATIONS: string[] = ['creation', 'open', 'rename', 'execution', 'deletion'];

interface EventInfo {
  category: string | string[];
  /**
   * This denotes the `event.type` field for when an event is created, this can be `start` or `creation`
   */
  creationType: string;
}

/**
 * The valid ecs categories.
 */
export enum ECSCategory {
  Driver = 'driver',
  File = 'file',
  Network = 'network',
  /**
   * Registry has not been added to ecs yet.
   */
  Registry = 'registry',
  Authentication = 'authentication',
  Session = 'session',
}

/**
 * High level categories for related events. These specify the type of related events that should be generated.
 */
export enum RelatedEventCategory {
  /**
   * The Random category allows the related event categories to be chosen randomly
   */
  Random = 'random',
  Driver = 'driver',
  File = 'file',
  Network = 'network',
  Registry = 'registry',
  /**
   * Security isn't an actual category but defines a type of related event to be created.
   */
  Security = 'security',
}

/**
 * This map defines the relationship between a higher level event type defined by the RelatedEventCategory enums and
 * the ECS categories that is should map to. This should only be used for tests that need to determine the exact
 * ecs categories that were created based on the related event information passed to the generator.
 */
export const categoryMapping: Record<RelatedEventCategory, ECSCategory | ECSCategory[] | ''> = {
  [RelatedEventCategory.Security]: [ECSCategory.Authentication, ECSCategory.Session],
  [RelatedEventCategory.Driver]: ECSCategory.Driver,
  [RelatedEventCategory.File]: ECSCategory.File,
  [RelatedEventCategory.Network]: ECSCategory.Network,
  [RelatedEventCategory.Registry]: ECSCategory.Registry,
  /**
   * Random is only used by the generator to indicate that it should randomly choose the event information when generating
   * related events. It does not map to a specific ecs category.
   */
  [RelatedEventCategory.Random]: '',
};

/**
 * The related event category and number of events that should be generated.
 */
export interface RelatedEventInfo {
  category: RelatedEventCategory;
  count: number;
}

// These are from the v1 schemas and aren't all valid ECS event categories, still in flux
const OTHER_EVENT_CATEGORIES: Record<
  Exclude<RelatedEventCategory, RelatedEventCategory.Random>,
  EventInfo
> = {
  [RelatedEventCategory.Security]: {
    category: categoryMapping[RelatedEventCategory.Security],
    creationType: 'start',
  },
  [RelatedEventCategory.Driver]: {
    category: categoryMapping[RelatedEventCategory.Driver],
    creationType: 'start',
  },
  [RelatedEventCategory.File]: {
    category: categoryMapping[RelatedEventCategory.File],
    creationType: 'creation',
  },
  [RelatedEventCategory.Network]: {
    category: categoryMapping[RelatedEventCategory.Network],
    creationType: 'start',
  },
  [RelatedEventCategory.Registry]: {
    category: categoryMapping[RelatedEventCategory.Registry],
    creationType: 'creation',
  },
};

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
      applied: {
        id: string;
        status: HostPolicyResponseActionStatus;
        name: string;
      };
    };
  };
}

interface NodeState {
  event: Event;
  childrenCreated: number;
  maxChildren: number;
}

/**
 * The Tree and TreeNode interfaces define structures to make testing of resolver functionality easier. The `generateTree`
 * method builds a `Tree` structures which organizes the different parts of the resolver tree. Maps are used to allow
 * tests to quickly verify if the node they retrieved from ES was actually created by the generator or if there is an
 * issue with the implementation. The `Tree` structure serves as a source of truth for queries to ES. The entire Tree
 * is stored in memory so it can be quickly accessed by the tests. The resolver api_integration tests currently leverage
 * these structures for verifying that its implementation is returning the correct documents from ES and structuring
 * the response correctly.
 */

/**
 * Defines the fields for each node in the tree.
 */
export interface TreeNode {
  /**
   * The entity_id for the node
   */
  id: string;
  lifecycle: Event[];
  relatedEvents: Event[];
}

/**
 * A resolver tree that makes accessing specific nodes easier for tests.
 */
export interface Tree {
  /**
   * Map of entity_id to node
   */
  children: Map<string, TreeNode>;
  /**
   * Map of entity_id to node
   */
  ancestry: Map<string, TreeNode>;
  origin: TreeNode;
  alertEvent: Event;
  /**
   * All events from children, ancestry, origin, and the alert in a single array
   */
  allEvents: Event[];
}

export interface TreeOptions {
  /**
   * The value in ancestors does not include the origin/root node
   */
  ancestors?: number;
  generations?: number;
  children?: number;
  relatedEvents?: RelatedEventInfo[];
  percentWithRelated?: number;
  percentTerminated?: number;
  alwaysGenMaxChildrenPerNode?: boolean;
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

  /**
   * Creates new random policy id for the host to simulate new policy application
   */
  public updatePolicyId() {
    this.commonInfo.endpoint.policy.applied.id = this.randomChoice(APPLIED_POLICIES).id;
    this.commonInfo.endpoint.policy.applied.status = this.randomChoice([
      HostPolicyResponseActionStatus.success,
      HostPolicyResponseActionStatus.failure,
      HostPolicyResponseActionStatus.warning,
    ]);
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
        policy: {
          applied: this.randomChoice(APPLIED_POLICIES),
        },
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
   * This generates a full resolver tree and keeps the entire tree in memory. This is useful for tests that want
   * to compare results from elasticsearch with the actual events created by this generator. Because all the events
   * are stored in memory do not use this function to generate large trees.
   *
   * @param options - options for the layout of the tree, like how many children, generations, and ancestry
   * @returns a Tree structure that makes accessing specific events easier
   */
  public generateTree(options: TreeOptions = {}): Tree {
    const addEventToMap = (nodeMap: Map<string, TreeNode>, event: Event) => {
      const nodeId = event.process.entity_id;
      // if a node already exists for the entity_id we'll use that one, otherwise let's create a new empty node
      // and add the event to the right array.
      let node = nodeMap.get(nodeId);
      if (!node) {
        node = { id: nodeId, lifecycle: [], relatedEvents: [] };
      }

      // place the event in the right array depending on its category
      if (event.event.category === 'process') {
        node.lifecycle.push(event);
      } else {
        node.relatedEvents.push(event);
      }
      return nodeMap.set(nodeId, node);
    };

    const ancestry = this.createAlertEventAncestry(
      options.ancestors,
      options.relatedEvents,
      options.percentWithRelated,
      options.percentTerminated
    );

    // create a mapping of entity_id -> lifecycle and related events
    // slice gets everything but the last item which is an alert
    const ancestryNodes: Map<string, TreeNode> = ancestry
      .slice(0, -1)
      .reduce(addEventToMap, new Map());

    const alert = ancestry[ancestry.length - 1];
    const origin = ancestryNodes.get(alert.process.entity_id);
    if (!origin) {
      throw Error(`could not find origin while building tree: ${alert.process.entity_id}`);
    }

    // remove the origin node from the ancestry array
    ancestryNodes.delete(alert.process.entity_id);

    const children = Array.from(
      this.descendantsTreeGenerator(
        alert,
        options.generations,
        options.children,
        options.relatedEvents,
        options.percentWithRelated,
        options.percentTerminated,
        options.alwaysGenMaxChildrenPerNode
      )
    );

    const childrenNodes: Map<string, TreeNode> = children.reduce(addEventToMap, new Map());

    return {
      children: childrenNodes,
      ancestry: ancestryNodes,
      alertEvent: alert,
      allEvents: [...ancestry, ...children],
      origin,
    };
  }

  /**
   * Wrapper generator for fullResolverTreeGenerator to make it easier to quickly stream
   * many resolver trees to Elasticsearch.
   * @param numAlerts - number of alerts to generate
   * @param alertAncestors - number of ancestor generations to create relative to the alert
   * @param childGenerations - number of child generations to create relative to the alert
   * @param maxChildrenPerNode - maximum number of children for any given node in the tree
   * @param relatedEventsPerNode - number of related events (file, registry, etc) to create for each process event in the tree
   * @param percentNodesWithRelated - percent of nodes which should have related events
   * @param percentTerminated - percent of nodes which will have process termination events
   * @param alwaysGenMaxChildrenPerNode - flag to always return the max children per node instead of it being a random number of children
   */
  public *alertsGenerator(
    numAlerts: number,
    alertAncestors?: number,
    childGenerations?: number,
    maxChildrenPerNode?: number,
    relatedEventsPerNode?: number,
    percentNodesWithRelated?: number,
    percentTerminated?: number,
    alwaysGenMaxChildrenPerNode?: boolean
  ) {
    for (let i = 0; i < numAlerts; i++) {
      yield* this.fullResolverTreeGenerator(
        alertAncestors,
        childGenerations,
        maxChildrenPerNode,
        relatedEventsPerNode,
        percentNodesWithRelated,
        percentTerminated,
        alwaysGenMaxChildrenPerNode
      );
    }
  }

  /**
   * Generator function that creates the full set of events needed to render resolver.
   * The number of nodes grows exponentially with the number of generations and children per node.
   * Each node is logically a process, and will have 1 or more process events associated with it.
   * @param alertAncestors - number of ancestor generations to create relative to the alert
   * @param childGenerations - number of child generations to create relative to the alert
   * @param maxChildrenPerNode - maximum number of children for any given node in the tree
   * @param relatedEventsPerNode - can be an array of RelatedEventInfo objects describing the related events that should be generated for each process node
   *  or a number which defines the number of related events and will default to random categories
   * @param percentNodesWithRelated - percent of nodes which should have related events
   * @param percentTerminated - percent of nodes which will have process termination events
   * @param alwaysGenMaxChildrenPerNode - flag to always return the max children per node instead of it being a random number of children
   */
  public *fullResolverTreeGenerator(
    alertAncestors?: number,
    childGenerations?: number,
    maxChildrenPerNode?: number,
    relatedEventsPerNode?: RelatedEventInfo[] | number,
    percentNodesWithRelated?: number,
    percentTerminated?: number,
    alwaysGenMaxChildrenPerNode?: boolean
  ) {
    const ancestry = this.createAlertEventAncestry(
      alertAncestors,
      relatedEventsPerNode,
      percentNodesWithRelated,
      percentTerminated
    );
    for (let i = 0; i < ancestry.length; i++) {
      yield ancestry[i];
    }
    // ancestry will always have at least 2 elements, and the last element will be the alert
    yield* this.descendantsTreeGenerator(
      ancestry[ancestry.length - 1],
      childGenerations,
      maxChildrenPerNode,
      relatedEventsPerNode,
      percentNodesWithRelated,
      percentTerminated,
      alwaysGenMaxChildrenPerNode
    );
  }

  /**
   * Creates an alert event and associated process ancestry. The alert event will always be the last event in the return array.
   * @param alertAncestors - number of ancestor generations to create
   * @param relatedEventsPerNode - can be an array of RelatedEventInfo objects describing the related events that should be generated for each process node
   *  or a number which defines the number of related events and will default to random categories
   * @param pctWithRelated - percent of ancestors that will have related events
   * @param pctWithTerminated - percent of ancestors that will have termination events
   */
  public createAlertEventAncestry(
    alertAncestors = 3,
    relatedEventsPerNode: RelatedEventInfo[] | number = 5,
    pctWithRelated = 30,
    pctWithTerminated = 100
  ): Event[] {
    const events = [];
    const startDate = new Date().getTime();
    const root = this.generateEvent({ timestamp: startDate + 1000 });
    events.push(root);
    let ancestor = root;
    let timestamp = root['@timestamp'] + 1000;

    // generate related alerts for root
    const processDuration: number = 6 * 3600;
    if (this.randomN(100) < pctWithRelated) {
      for (const relatedEvent of this.relatedEventsGenerator(
        ancestor,
        relatedEventsPerNode,
        processDuration
      )) {
        events.push(relatedEvent);
      }
    }

    // generate the termination event for the root
    if (this.randomN(100) < pctWithTerminated) {
      const termProcessDuration = this.randomN(1000000); // This lets termination events be up to 1 million seconds after the creation event (~11 days)
      events.push(
        this.generateEvent({
          timestamp: timestamp + termProcessDuration * 1000,
          entityID: root.process.entity_id,
          parentEntityID: root.process.parent?.entity_id,
          eventCategory: 'process',
          eventType: 'end',
        })
      );
    }

    for (let i = 0; i < alertAncestors; i++) {
      ancestor = this.generateEvent({
        timestamp,
        parentEntityID: ancestor.process.entity_id,
      });
      events.push(ancestor);
      timestamp = timestamp + 1000;

      if (this.randomN(100) < pctWithTerminated) {
        const termProcessDuration = this.randomN(1000000); // This lets termination events be up to 1 million seconds after the creation event (~11 days)
        events.push(
          this.generateEvent({
            timestamp: timestamp + termProcessDuration * 1000,
            entityID: ancestor.process.entity_id,
            parentEntityID: ancestor.process.parent?.entity_id,
            eventCategory: 'process',
            eventType: 'end',
          })
        );
      }

      // generate related alerts for ancestor
      if (this.randomN(100) < pctWithRelated) {
        for (const relatedEvent of this.relatedEventsGenerator(
          ancestor,
          relatedEventsPerNode,
          processDuration
        )) {
          events.push(relatedEvent);
        }
      }
    }
    events.push(
      this.generateAlert(timestamp, ancestor.process.entity_id, ancestor.process.parent?.entity_id)
    );
    return events;
  }

  /**
   * Creates the child generations of a process.  The number of returned events grows exponentially with generations and maxChildrenPerNode.
   * @param root - The process event to use as the root node of the tree
   * @param generations - number of child generations to create. The root node is not counted as a generation.
   * @param maxChildrenPerNode - maximum number of children for any given node in the tree
   * @param relatedEventsPerNode - can be an array of RelatedEventInfo objects describing the related events that should be generated for each process node
   *  or a number which defines the number of related events and will default to random categories
   * @param percentNodesWithRelated - percent of nodes which should have related events
   * @param percentChildrenTerminated - percent of nodes which will have process termination events
   * @param alwaysGenMaxChildrenPerNode - flag to always return the max children per node instead of it being a random number of children
   */
  public *descendantsTreeGenerator(
    root: Event,
    generations = 2,
    maxChildrenPerNode = 2,
    relatedEventsPerNode: RelatedEventInfo[] | number = 3,
    percentNodesWithRelated = 100,
    percentChildrenTerminated = 100,
    alwaysGenMaxChildrenPerNode = false
  ) {
    let maxChildren = this.randomN(maxChildrenPerNode + 1);
    if (alwaysGenMaxChildrenPerNode) {
      maxChildren = maxChildrenPerNode;
    }

    const rootState: NodeState = {
      event: root,
      childrenCreated: 0,
      maxChildren,
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
        // eslint-disable-next-line no-continue
        continue;
      }
      // Otherwise, add a child and any nodes associated with it
      currentState.childrenCreated++;
      timestamp = timestamp + 1000;
      const child = this.generateEvent({
        timestamp,
        parentEntityID: currentState.event.process.entity_id,
      });

      maxChildren = this.randomN(maxChildrenPerNode + 1);
      if (alwaysGenMaxChildrenPerNode) {
        maxChildren = maxChildrenPerNode;
      }
      lineage.push({
        event: child,
        childrenCreated: 0,
        maxChildren,
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
   * @param relatedEvents - can be an array of RelatedEventInfo objects describing the related events that should be generated for each process node
   *  or a number which defines the number of related events and will default to random categories
   * @param processDuration - maximum number of seconds after process event that related event timestamp can be
   */
  public *relatedEventsGenerator(
    node: Event,
    relatedEvents: RelatedEventInfo[] | number = 10,
    processDuration: number = 6 * 3600
  ) {
    let relatedEventsInfo: RelatedEventInfo[];
    if (typeof relatedEvents === 'number') {
      relatedEventsInfo = [{ category: RelatedEventCategory.Random, count: relatedEvents }];
    } else {
      relatedEventsInfo = relatedEvents;
    }
    for (const event of relatedEventsInfo) {
      let eventInfo: EventInfo;

      for (let i = 0; i < event.count; i++) {
        if (event.category === RelatedEventCategory.Random) {
          eventInfo = this.randomChoice(Object.values(OTHER_EVENT_CATEGORIES));
        } else {
          eventInfo = OTHER_EVENT_CATEGORIES[event.category];
        }

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
  }

  /**
   * Generates an Ingest `datasource` that includes the Endpoint Policy data
   */
  public generatePolicyDatasource(): PolicyData {
    const created = new Date(Date.now() - 8.64e7).toISOString(); // 24h ago
    return {
      id: this.seededUUIDv4(),
      name: 'Endpoint Policy',
      description: 'Policy to protect the worlds data',
      created_at: created,
      created_by: 'elastic',
      updated_at: new Date().toISOString(),
      updated_by: 'elastic',
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
  public generatePolicyResponse(
    ts = new Date().getTime(),
    allStatus?: HostPolicyResponseActionStatus
  ): HostPolicyResponse {
    const policyVersion = this.seededUUIDv4();
    const status = () => {
      return allStatus || this.randomHostPolicyResponseActionStatus();
    };
    return {
      '@timestamp': ts,
      agent: {
        id: this.commonInfo.agent.id,
        version: '1.0.0-local.20200416.0',
      },
      elastic: {
        agent: {
          id: this.commonInfo.elastic.agent.id,
        },
      },
      ecs: {
        version: '1.4.0',
      },
      host: {
        id: this.commonInfo.host.id,
      },
      endpoint: {
        policy: {
          applied: {
            actions: [
              {
                name: 'configure_elasticsearch_connection',
                message: 'elasticsearch comes configured successfully',
                status: HostPolicyResponseActionStatus.success,
              },
              {
                name: 'configure_kernel',
                message: 'Failed to configure kernel',
                status: HostPolicyResponseActionStatus.failure,
              },
              {
                name: 'configure_logging',
                message: 'Successfully configured logging',
                status: HostPolicyResponseActionStatus.success,
              },
              {
                name: 'configure_malware',
                message: 'Unexpected error configuring malware',
                status: HostPolicyResponseActionStatus.failure,
              },
              {
                name: 'connect_kernel',
                message: 'Successfully initialized minifilter',
                status: HostPolicyResponseActionStatus.success,
              },
              {
                name: 'detect_file_open_events',
                message: 'Successfully stopped file open event reporting',
                status: HostPolicyResponseActionStatus.success,
              },
              {
                name: 'detect_file_write_events',
                message: 'Failed to stop file write event reporting',
                status: HostPolicyResponseActionStatus.success,
              },
              {
                name: 'detect_image_load_events',
                message: 'Successfully started image load event reporting',
                status: HostPolicyResponseActionStatus.success,
              },
              {
                name: 'detect_process_events',
                message: 'Successfully started process event reporting',
                status: HostPolicyResponseActionStatus.success,
              },
              {
                name: 'download_global_artifacts',
                message: 'Failed to download EXE model',
                status: HostPolicyResponseActionStatus.success,
              },
              {
                name: 'load_config',
                message: 'Successfully parsed configuration',
                status: HostPolicyResponseActionStatus.success,
              },
              {
                name: 'load_malware_model',
                message: 'Error deserializing EXE model; no valid malware model installed',
                status: HostPolicyResponseActionStatus.success,
              },
              {
                name: 'read_elasticsearch_config',
                message: 'Successfully read Elasticsearch configuration',
                status: HostPolicyResponseActionStatus.success,
              },
              {
                name: 'read_events_config',
                message: 'Successfully read events configuration',
                status: HostPolicyResponseActionStatus.success,
              },
              {
                name: 'read_kernel_config',
                message: 'Succesfully read kernel configuration',
                status: HostPolicyResponseActionStatus.success,
              },
              {
                name: 'read_logging_config',
                message: 'Field (logging.debugview) not found in config',
                status: HostPolicyResponseActionStatus.success,
              },
              {
                name: 'read_malware_config',
                message: 'Successfully read malware detect configuration',
                status: HostPolicyResponseActionStatus.success,
              },
              {
                name: 'workflow',
                message: 'Failed to apply a portion of the configuration (kernel)',
                status: HostPolicyResponseActionStatus.success,
              },
              {
                name: 'download_model',
                message: 'Failed to apply a portion of the configuration (kernel)',
                status: HostPolicyResponseActionStatus.success,
              },
              {
                name: 'ingest_events_config',
                message: 'Failed to apply a portion of the configuration (kernel)',
                status: HostPolicyResponseActionStatus.success,
              },
            ],
            id: this.commonInfo.endpoint.policy.applied.id,
            response: {
              configurations: {
                events: {
                  concerned_actions: ['download_model'],
                  status: status(),
                },
                logging: {
                  concerned_actions: this.randomHostPolicyResponseActionNames(),
                  status: status(),
                },
                malware: {
                  concerned_actions: this.randomHostPolicyResponseActionNames(),
                  status: status(),
                },
                streaming: {
                  concerned_actions: this.randomHostPolicyResponseActionNames(),
                  status: status(),
                },
              },
            },
            artifacts: {
              global: {
                version: '1.4.0',
                identifiers: [
                  {
                    name: 'endpointpe-model',
                    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                  },
                ],
              },
              user: {
                version: '1.4.0',
                identifiers: [
                  {
                    name: 'user-model',
                    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                  },
                ],
              },
            },
            status: this.commonInfo.endpoint.policy.applied.status,
            version: policyVersion,
            name: this.commonInfo.endpoint.policy.applied.name,
          },
        },
      },
      event: {
        created: ts,
        id: this.seededUUIDv4(),
        kind: 'state',
        category: 'host',
        type: 'change',
        module: 'endpoint',
        action: 'endpoint_policy_response',
        dataset: 'endpoint.policy',
      },
    };
  }

  private randomN(n: number): number {
    return Math.floor(this.random() * n);
  }

  private *randomNGenerator(max: number, count: number) {
    let iCount = count;
    while (iCount > 0) {
      yield this.randomN(max);
      iCount = iCount - 1;
    }
  }

  private randomArray<T>(lengthLimit: number, generator: () => T): T[] {
    const rand = this.randomN(lengthLimit) + 1;
    return [...Array(rand).keys()].map(generator);
  }

  private randomMac(): string {
    return [...this.randomNGenerator(255, 6)].map((x) => x.toString(16)).join('-');
  }

  private randomIP(): string {
    return [10, ...this.randomNGenerator(255, 3)].map((x) => x.toString()).join('.');
  }

  private randomVersion(): string {
    return [6, ...this.randomNGenerator(10, 2)].map((x) => x.toString()).join('.');
  }

  private randomChoice<T>(choices: T[]): T {
    return choices[this.randomN(choices.length)];
  }

  private randomString(length: number): string {
    return [...this.randomNGenerator(36, length)].map((x) => x.toString(36)).join('');
  }

  private randomHostname(): string {
    return `Host-${this.randomString(10)}`;
  }

  private seededUUIDv4(): string {
    return uuid.v4({ random: [...this.randomNGenerator(255, 16)] });
  }

  private randomHostPolicyResponseActionNames(): string[] {
    return this.randomArray(this.randomN(8), () =>
      this.randomChoice([
        'load_config',
        'workflow',
        'download_global_artifacts',
        'configure_malware',
        'read_malware_config',
        'load_malware_model',
        'read_kernel_config',
        'configure_kernel',
        'detect_process_events',
        'detect_file_write_events',
        'detect_file_open_events',
        'detect_image_load_events',
        'connect_kernel',
      ])
    );
  }

  private randomHostPolicyResponseActionStatus(): HostPolicyResponseActionStatus {
    return this.randomChoice([
      HostPolicyResponseActionStatus.failure,
      HostPolicyResponseActionStatus.success,
      HostPolicyResponseActionStatus.warning,
    ]);
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
