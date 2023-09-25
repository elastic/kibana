/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toClientContract } from './helpers';

const testLocations = {
  locations: [
    {
      label: 'BEEP',
      agentPolicyId: 'e3134290-0f73-11ee-ba15-159f4f728deb',
      id: 'e3134290-0f73-11ee-ba15-159f4f728dec',
      geo: { lat: 0, lon: 0 },
      concurrentMonitors: 1,
      isInvalid: false,
      isServiceManaged: false,
      tags: ['a tag 2'],
    },
    {
      label: 'BEEP',
      agentPolicyId: 'e3134290-0f73-11ee-ba15-159f4f728dec',
      id: 'e3134290-0f73-11ee-ba15-159f4f728dec',
      geo: { lat: '', lon: '' },
      concurrentMonitors: 1,
      isInvalid: true,
      isServiceManaged: true,
      tags: ['a tag'],
    },
  ],
};

const testLocations2 = {
  locations: [
    {
      label: 'BEEP',
      agentPolicyId: 'e3134290-0f73-11ee-ba15-159f4f728deb',
      id: 'e3134290-0f73-11ee-ba15-159f4f728dec',
      geo: { lat: -10, lon: 20 },
      concurrentMonitors: 1,
      isInvalid: false,
      isServiceManaged: false,
      tags: ['a tag 2'],
    },
    {
      label: 'BEEP',
      agentPolicyId: 'e3134290-0f73-11ee-ba15-159f4f728dec',
      id: 'e3134290-0f73-11ee-ba15-159f4f728dec',
      geo: { lat: -10, lon: 20 },
      concurrentMonitors: 1,
      isInvalid: true,
      isServiceManaged: true,
      tags: ['a tag'],
    },
  ],
};

describe('toClientContract', () => {
  it('formats SO attributes to client contract with falsy geo location', () => {
    // @ts-ignore fixtures are purposely wrong types for testing
    expect(toClientContract(testLocations)).toEqual({
      locations: [
        {
          agentPolicyId: 'e3134290-0f73-11ee-ba15-159f4f728deb',
          concurrentMonitors: 1,
          geo: {
            lat: 0,
            lon: 0,
          },
          id: 'e3134290-0f73-11ee-ba15-159f4f728dec',
          isInvalid: true,
          isServiceManaged: false,
          label: 'BEEP',
          tags: ['a tag 2'],
        },
        {
          agentPolicyId: 'e3134290-0f73-11ee-ba15-159f4f728dec',
          concurrentMonitors: 1,
          geo: {
            lat: '',
            lon: '',
          },
          id: 'e3134290-0f73-11ee-ba15-159f4f728dec',
          isInvalid: true,
          isServiceManaged: false,
          label: 'BEEP',
          tags: ['a tag'],
        },
      ],
    });
  });

  it('formats SO attributes to client contract with truthy geo location', () => {
    // @ts-ignore fixtures are purposely wrong types for testing
    expect(toClientContract(testLocations2)).toEqual({
      locations: [
        {
          agentPolicyId: 'e3134290-0f73-11ee-ba15-159f4f728deb',
          concurrentMonitors: 1,
          geo: {
            lat: -10,
            lon: 20,
          },
          id: 'e3134290-0f73-11ee-ba15-159f4f728dec',
          isInvalid: true,
          isServiceManaged: false,
          label: 'BEEP',
          tags: ['a tag 2'],
        },
        {
          agentPolicyId: 'e3134290-0f73-11ee-ba15-159f4f728dec',
          concurrentMonitors: 1,
          geo: {
            lat: -10,
            lon: 20,
          },
          id: 'e3134290-0f73-11ee-ba15-159f4f728dec',
          isInvalid: true,
          isServiceManaged: false,
          label: 'BEEP',
          tags: ['a tag'],
        },
      ],
    });
  });
});
