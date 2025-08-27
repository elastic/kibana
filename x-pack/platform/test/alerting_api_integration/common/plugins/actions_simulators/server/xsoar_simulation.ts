/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type http from 'http';
import type {
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
  IRouter,
} from '@kbn/core/server';
import type { ProxyArgs } from './simulator';
import { Simulator } from './simulator';

export const XSOARPlaybook0 = {
  id: '8db0105c-f674-4d83-8095-f95a9f61e77a',
  version: 4,
  cacheVersn: 0,
  sequenceNumber: 33831652,
  primaryTerm: 11,
  modified: '2023-12-12T13:51:15.668021556Z',
  sizeInBytes: 0,
  packID: '',
  packName: '',
  itemVersion: '',
  fromServerVersion: '',
  toServerVersion: '',
  propagationLabels: ['all'],
  definitionId: '',
  vcShouldIgnore: false,
  vcShouldKeepItemLegacyProdMachine: false,
  commitMessage: '',
  shouldCommit: false,
  name: 'playbook0',
  nameRaw: 'playbook0',
  prevName: 'aaa',
  startTaskId: '0',
  tasks: {
    '0': {
      id: '0',
      taskId: 'e228a044-2ad5-4ab0-873a-d5bb94a5c1b4',
      type: 'start',
      task: {
        id: 'e228a044-2ad5-4ab0-873a-d5bb94a5c1b4',
        version: 1,
        cacheVersn: 0,
        sequenceNumber: 13431901,
        primaryTerm: 8,
        modified: '2023-05-23T07:16:19.930125981Z',
        sizeInBytes: 0,
      },
      nextTasks: {
        '#none#': ['1'],
      },
      continueOnErrorType: '',
      view: {
        position: {
          x: 450,
          y: 50,
        },
      },
      evidenceData: {},
    },
    '1': {
      id: '1',
      taskId: 'c28b63d3-c860-4e16-82b4-6db6b58bdee3',
      type: 'regular',
      task: {
        id: 'c28b63d3-c860-4e16-82b4-6db6b58bdee3',
        version: 1,
        cacheVersn: 0,
        sequenceNumber: 33831651,
        primaryTerm: 11,
        modified: '2023-12-12T13:51:15.604271789Z',
        sizeInBytes: 0,
        name: 'Untitled Task 1',
        description: 'commands.local.cmd.set.incident',
        scriptId: 'Builtin|||setIncident',
        type: 'regular',
        isCommand: true,
        brand: 'Builtin',
      },
      scriptArguments: {
        severity: {
          simple: '1',
        },
      },
      continueOnErrorType: '',
      view: {
        position: {
          x: 450,
          y: 200,
        },
      },
      evidenceData: {},
    },
  },
  taskIds: ['e228a044-2ad5-4ab0-873a-d5bb94a5c1b4', 'c28b63d3-c860-4e16-82b4-6db6b58bdee3'],
  scriptIds: [],
  commands: ['setIncident'],
  brands: ['Builtin'],
  missingScriptsIds: ['Builtin|||setIncident'],
  view: {
    linkLabelsPosition: {},
    paper: {
      dimensions: {
        height: 245,
        width: 380,
        x: 450,
        y: 50,
      },
    },
  },
  inputs: null,
  outputs: null,
  quiet: true,
};

export const XSOARPlaybooksResponse = {
  playbooks: [XSOARPlaybook0],
  tags: [
    'Phishing',
    'Sandbox',
    'Severity',
    'Malware',
    'Remediation',
    'Job',
    'Sinkhole',
    'TIM',
    'PAN-OS',
  ],
  total: 1,
};

export const XSOARRunSuccessResponse = {
  id: '178791',
  version: 0,
  cacheVersn: 0,
  modified: '1970-01-01T00:00:00Z',
  sizeInBytes: 0,
  CustomFields: {
    bmcassignee: [{}],
    bmccustomer: [{}],
    bmcrequester: [{}],
    containmentsla: {
      accumulatedPause: 0,
      breachTriggered: false,
      dueDate: '0001-01-01T00:00:00Z',
      endDate: '0001-01-01T00:00:00Z',
      lastPauseDate: '0001-01-01T00:00:00Z',
      runStatus: 'idle',
      sla: 30,
      slaStatus: -1,
      startDate: '0001-01-01T00:00:00Z',
      totalDuration: 0,
    },
    crowdstrikefalconbehaviourpatterndispositiondetails: [{}, {}, {}],
    datadogcloudsiem: [{}, {}, {}],
    dataminrpulserelatedterms: [{}, {}, {}],
    decyfirdatadetails: [{}, {}, {}],
    detectionsla: {
      accumulatedPause: 0,
      breachTriggered: false,
      dueDate: '0001-01-01T00:00:00Z',
      endDate: '0001-01-01T00:00:00Z',
      lastPauseDate: '0001-01-01T00:00:00Z',
      runStatus: 'idle',
      sla: 20,
      slaStatus: -1,
      startDate: '0001-01-01T00:00:00Z',
      totalDuration: 0,
    },
    domaintoolsirisdetect: [{}, {}, {}],
    endpoint: [{}],
    externalid: '178791',
    extrahoprevealxdetectiondevices: [{}, {}, {}],
    extrahoprevealxmitretechniques: [{}, {}, {}],
    filerelationships: [{}, {}, {}],
    fortisiemattacktactics: [{}, {}],
    fortisiemevents: [{}],
    incidentduration: {
      accumulatedPause: 0,
      breachTriggered: false,
      dueDate: '0001-01-01T00:00:00Z',
      endDate: '0001-01-01T00:00:00Z',
      lastPauseDate: '0001-01-01T00:00:00Z',
      runStatus: 'idle',
      sla: 0,
      slaStatus: -1,
      startDate: '0001-01-01T00:00:00Z',
      totalDuration: 0,
    },
    incidentrdpachehuntingstringssimilarity: [{}, {}, {}],
    incidentrdpcachehuntingstringsifter: [{}, {}, {}],
    inventasource: [{}],
    microsoftsentinelowner: [],
    qintelqwatchexposures: [{}, {}, {}],
    remediationsla: {
      accumulatedPause: 0,
      breachTriggered: false,
      dueDate: '0001-01-01T00:00:00Z',
      endDate: '0001-01-01T00:00:00Z',
      lastPauseDate: '0001-01-01T00:00:00Z',
      runStatus: 'idle',
      sla: 7200,
      slaStatus: -1,
      startDate: '0001-01-01T00:00:00Z',
      totalDuration: 0,
    },
    rsametasevents: [],
    rsarawlogslist: [],
    securitypolicymatch: [{}],
    similarincidentsdbot: [{}],
    spycloudcompassdevicedata: [{}, {}, {}],
    suspiciousexecutions: [{}, {}, {}],
    timetoassignment: {
      accumulatedPause: 0,
      breachTriggered: false,
      dueDate: '0001-01-01T00:00:00Z',
      endDate: '0001-01-01T00:00:00Z',
      lastPauseDate: '0001-01-01T00:00:00Z',
      runStatus: 'idle',
      sla: 0,
      slaStatus: -1,
      startDate: '0001-01-01T00:00:00Z',
      totalDuration: 0,
    },
    triagesla: {
      accumulatedPause: 0,
      breachTriggered: false,
      dueDate: '0001-01-01T00:00:00Z',
      endDate: '0001-01-01T00:00:00Z',
      lastPauseDate: '0001-01-01T00:00:00Z',
      runStatus: 'idle',
      sla: 30,
      slaStatus: -1,
      startDate: '0001-01-01T00:00:00Z',
      totalDuration: 0,
    },
    urlsslverification: [],
    xdralertsearchresults: [{}, {}, {}],
    xdrinvestigationresults: [
      {},
      {},
      {},
      {
        columnheader1: '',
      },
      {},
      {
        columnheader1: '',
      },
      {},
      {},
    ],
    xpanseserviceclassifications: [{}, {}, {}],
    xpanseservicevalidation: [
      {
        columnheader1: '',
      },
      {},
      {},
    ],
  },
  account: '',
  autime: 1713700028107000000,
  type: 'Unclassified',
  rawType: 'Unclassified',
  name: 'My test incident',
  rawName: 'My test incident',
  status: 0,
  custom_status: '',
  resolution_status: '',
  reason: '',
  created: '2024-04-21T11:47:08.107Z',
  occurred: '2024-04-21T11:47:08.107982676Z',
  closed: '0001-01-01T00:00:00Z',
  sla: 0,
  severity: 2,
  investigationId: '',
  labels: [
    {
      value: '',
      type: 'Instance',
    },
    {
      value: 'Manual',
      type: 'Brand',
    },
  ],
  attachment: null,
  details: 'My test incident',
  openDuration: 0,
  lastOpen: '0001-01-01T00:00:00Z',
  closingUserId: '',
  owner: '',
  activated: '0001-01-01T00:00:00Z',
  closeReason: '',
  rawCloseReason: '',
  closeNotes: '',
  playbookId: '8db0105c-f674-4d83-8095-f95a9f61e77a',
  dueDate: '2024-05-01T11:47:08.107988742Z',
  reminder: '0001-01-01T00:00:00Z',
  runStatus: '',
  notifyTime: '0001-01-01T00:00:00Z',
  phase: '',
  rawPhase: '',
  isPlayground: false,
  rawJSON: '',
  parent: '',
  parentXDRIncident: '',
  retained: false,
  category: '',
  rawCategory: '',
  linkedIncidents: null,
  linkedCount: 0,
  droppedCount: 0,
  sourceInstance: '',
  sourceBrand: 'Manual',
  canvases: null,
  lastJobRunTime: '0001-01-01T00:00:00Z',
  feedBased: false,
  dbotMirrorId: '',
  dbotMirrorInstance: '',
  dbotMirrorDirection: '',
  dbotDirtyFields: null,
  dbotCurrentDirtyFields: null,
  dbotMirrorTags: null,
  dbotMirrorLastSync: '0001-01-01T00:00:00Z',
  isDebug: false,
};

export const XSOARFailedResponse = {
  id: 'incCreateErr',
  status: 400,
  title: 'Failed creating incident',
  detail: 'Failed creating incident',
  error: '',
  encrypted: false,
  multires: null,
};

export class XSOARSimulator extends Simulator {
  private readonly returnError: boolean;

  constructor({ returnError = false, proxy }: { returnError?: boolean; proxy?: ProxyArgs }) {
    super(proxy);

    this.returnError = returnError;
  }

  public async handler(
    request: http.IncomingMessage,
    response: http.ServerResponse,
    data: Record<string, unknown>
  ) {
    if (this.returnError) {
      return XSOARSimulator.sendErrorResponse(response);
    }
    return XSOARSimulator.sendResponse(request, response);
  }

  private static sendResponse(request: http.IncomingMessage, response: http.ServerResponse) {
    response.setHeader('Content-Type', 'application/json');
    let body;
    if (request.url?.match('/incident')) {
      response.statusCode = 201;
      body = XSOARRunSuccessResponse;
    } else if (request.url?.match('/playbook/search')) {
      response.statusCode = 200;
      body = XSOARPlaybooksResponse;
    }
    response.end(JSON.stringify(body, null, 4));
  }

  private static sendErrorResponse(response: http.ServerResponse) {
    response.statusCode = 400;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(XSOARFailedResponse, null, 4));
  }
}

export function initPlugin(router: IRouter, path: string) {
  router.post(
    {
      path: `${path}/playbook/search`,
      options: {
        authRequired: false,
      },
      validate: {},
      security: { authz: { enabled: false, reason: 'This route is opted out from authorization' } },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      return res.ok({ body: XSOARPlaybooksResponse });
    }
  );

  router.post(
    {
      path: `${path}/incident`,
      options: {
        authRequired: false,
      },
      validate: {},
      security: { authz: { enabled: false, reason: 'This route is opted out from authorization' } },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      return res.ok({ body: XSOARRunSuccessResponse });
    }
  );
}
