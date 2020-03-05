/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MapsType, FinalMapping, ParamsType } from './types';

const mapping: MapsType[] = [
  { source: 'title', target: 'short_description', onEditAndUpdate: 'nothing' },
  { source: 'description', target: 'description', onEditAndUpdate: 'nothing' },
  { source: 'comments', target: 'comments', onEditAndUpdate: 'nothing' },
];

const maliciousMapping: MapsType[] = [
  { source: '__proto__', target: 'short_description', onEditAndUpdate: 'nothing' },
  { source: 'description', target: '__proto__', onEditAndUpdate: 'nothing' },
  { source: 'comments', target: 'comments', onEditAndUpdate: 'nothing' },
  { source: 'unsupportedSource', target: 'comments', onEditAndUpdate: 'nothing' },
];

const finalMapping: FinalMapping = new Map();

finalMapping.set(mapping[0].source, {
  target: mapping[0].target,
  onEditAndUpdate: mapping[0].onEditAndUpdate,
});

finalMapping.set(mapping[1].source, {
  target: mapping[1].target,
  onEditAndUpdate: mapping[1].onEditAndUpdate,
});

finalMapping.set(mapping[2].source, {
  target: mapping[2].target,
  onEditAndUpdate: mapping[2].onEditAndUpdate,
});

finalMapping.set(mapping[0].target, {
  target: mapping[0].source,
  onEditAndUpdate: mapping[0].onEditAndUpdate,
});

const params: ParamsType = {
  executorAction: 'updateIncident',
  id: 'd4387ac5-0899-4dc2-bbfa-0dd605c934aa',
  incidentId: 'ceb5986e079f00100e48fbbf7c1ed06d',
  title: 'Incident title',
  description: 'Incident description',
  comments: [
    {
      id: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
      version: 'WzU3LDFd',
      comment: 'A comment',
    },
  ],
};

const responseIncident = {
  id: 'c816f79cc0a8016401c5a33be04be441',
  number: 'INC0010001',
};

export { mapping, maliciousMapping, finalMapping, params, responseIncident };
