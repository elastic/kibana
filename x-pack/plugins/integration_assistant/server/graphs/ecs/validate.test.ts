/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { processMapping } from './validate';

describe('Testing ecs handler', () => {
  it('processMapping()', async () => {
    const path: string[] = [];
    const value = {
      checkpoint: {
        firewall: {
          product: null,
          sequencenum: null,
          subject: null,
          ifdir: null,
          origin: {
            target: 'source.address',
            confidence: 0.9,
            type: 'string',
            date_formats: [],
          },
          flags: null,
          sendtotrackerasadvancedauditlog: null,
          originsicname: null,
          version: null,
          administrator: {
            target: 'user.name',
            confidence: 0.8,
            type: 'string',
            date_formats: [],
          },
          foo: {
            target: null, // Invalid value , to be skipped
            confidence: 0.8,
            type: 'string',
            date_formats: [],
          },
        },
      },
    };
    const output: Record<string, string[][]> = {};
    await processMapping(path, value, output);
    expect(output).toEqual({
      'source.address': [['checkpoint', 'firewall', 'origin']],
      'user.name': [['checkpoint', 'firewall', 'administrator']],
    });
  });
});
