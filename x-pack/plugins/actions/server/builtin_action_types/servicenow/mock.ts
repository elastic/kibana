/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MapsType, FinalMapping, ParamsType } from './types';
import { Incident } from './lib/types';

const mapping: MapsType[] = [
  { source: 'title', target: 'short_description', actionType: 'nothing' },
  { source: 'description', target: 'description', actionType: 'nothing' },
  { source: 'comments', target: 'comments', actionType: 'nothing' },
];

const finalMapping: FinalMapping = new Map();

finalMapping.set('title', {
  target: 'short_description',
  actionType: 'nothing',
});

finalMapping.set('description', {
  target: 'description',
  actionType: 'nothing',
});

finalMapping.set('comments', {
  target: 'comments',
  actionType: 'nothing',
});

finalMapping.set('short_description', {
  target: 'title',
  actionType: 'nothing',
});

const params: ParamsType = {
  caseId: 'd4387ac5-0899-4dc2-bbfa-0dd605c934aa',
  incidentId: 'ceb5986e079f00100e48fbbf7c1ed06d',
  title: 'Incident title',
  description: 'Incident description',
  comments: [
    {
      commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
      version: 'WzU3LDFd',
      comment: 'A comment',
      incidentCommentId: '263ede42075300100e48fbbf7c1ed047',
    },
    {
      commentId: 'e3db587f-ca27-4ae9-ad2e-31f2dcc9bd0d',
      version: 'WlK3LDFd',
      comment: 'Another comment',
      incidentCommentId: '315e1ece071300100e48fbbf7c1ed0d0',
    },
  ],
};

const incidentResponse = {
  incidentId: 'c816f79cc0a8016401c5a33be04be441',
  number: 'INC0010001',
};

const userId = '2e9a0a5e2f79001016ab51172799b670';

const axiosResponse = {
  status: 200,
  headers: {
    'content-type': 'application/json',
  },
};
const userIdResponse = {
  result: [{ sys_id: userId }],
};

const incidentAxiosResponse = {
  result: { sys_id: incidentResponse.incidentId, number: incidentResponse.number },
};

const instance = {
  url: 'https://instance.service-now.com',
  username: 'username',
  password: 'password',
};

const incident: Incident = {
  short_description: params.title,
  description: params.description,
  caller_id: userId,
};

export {
  mapping,
  finalMapping,
  params,
  incidentResponse,
  incidentAxiosResponse,
  userId,
  userIdResponse,
  axiosResponse,
  instance,
  incident,
};
