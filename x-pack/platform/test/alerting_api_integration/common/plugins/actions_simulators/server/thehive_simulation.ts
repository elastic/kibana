/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type http from 'http';

import type { ProxyArgs } from './simulator';
import { Simulator } from './simulator';

export class TheHiveSimulator extends Simulator {
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
      return TheHiveSimulator.sendErrorResponse(response);
    }
    const pathName = request.url!;
    return TheHiveSimulator.sendResponse(
      response,
      pathName.includes('case') ? theHiveCaseSuccessResponse : theHiveAlertSuccessResponse
    );
  }

  private static sendResponse(response: http.ServerResponse, data: any) {
    response.statusCode = 201;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(data, null, 4));
  }

  private static sendErrorResponse(response: http.ServerResponse) {
    response.statusCode = 400;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(theHiveFailedResponse, null, 4));
  }
}

export const theHiveCaseSuccessResponse = {
  _id: '~172064',
  _type: 'Case',
  _createdBy: 'user1@thehive.local',
  _createdAt: 1712128153041,
  number: 67,
  title: 'title',
  description: 'description',
  severity: 1,
  severityLabel: 'LOW',
  startDate: 1712128153029,
  tags: ['tag1', 'tag2'],
  flag: false,
  tlp: 2,
  tlpLabel: 'AMBER',
  pap: 2,
  papLabel: 'AMBER',
  status: 'New',
  stage: 'New',
  assignee: 'user1@thehive.local',
  customFields: [],
  userPermissions: [
    'manageCase/create',
    'manageAlert/update',
    'manageProcedure',
    'managePage',
    'manageObservable',
    'manageCase/delete',
    'manageAlert/create',
    'manageCaseReport',
    'manageAlert/delete',
    'accessTheHiveFS',
    'manageKnowledgeBase',
    'manageAction',
    'manageShare',
    'manageAnalyse',
    'manageFunction/invoke',
    'manageTask',
    'manageCase/merge',
    'manageCustomEvent',
    'manageAlert/import',
    'manageCase/changeOwnership',
    'manageComment',
    'manageAlert/reopen',
    'manageCase/update',
    'manageCase/reopen',
  ],
  extraData: {},
  newDate: 1712128153029,
  timeToDetect: 0,
};

export const theHiveAlertSuccessResponse = {
  _id: '~245821592',
  _type: 'Alert',
  _createdBy: 'user1@thehive.local',
  _createdAt: 1750411773815,
  type: 'type',
  source: 'source',
  sourceRef: 'sourceRef',
  title: 'title',
  description: 'description',
  severity: 1,
  severityLabel: 'LOW',
  date: 1750411773798,
  tags: ['tags1', 'tags2'],
  tlp: 2,
  tlpLabel: 'AMBER',
  pap: 2,
  papLabel: 'AMBER',
  follow: true,
  customFields: [],
  observableCount: 3,
  status: 'New',
  stage: 'New',
  extraData: {},
  newDate: 1750411773800,
  timeToDetect: 0,
};

export const theHiveFailedResponse = {
  type: 'BadRequest',
  message: 'Invalid json',
};
