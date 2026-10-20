/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { writeFileSync } from 'fs';
import {
  captureInvestigationArtifacts,
  writeInvestigationArtifact,
} from './investigation_artifacts';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));
const write = jest.mocked(writeFileSync);

beforeEach(() => write.mockClear());

it('retains the failed task output even if conversation recovery is unavailable', async () => {
  const output = {
    case_id: 'orca-case',
    query: 'Investigate the ORCA incident.',
    investigation_id: 'id',
    conversation_id: 'id',
    execution_error: 'Failed investigation',
  };
  const fetch = jest.fn().mockRejectedValue(new Error('Conversation unavailable'));
  await expect(captureInvestigationArtifacts({ output, fetch, modelId: 'model' })).rejects.toThrow(
    'Conversation unavailable'
  );
  expect(write.mock.calls[0][0]).toEqual(expect.stringContaining('orca-case-output.json'));
  expect(JSON.parse(String(write.mock.calls[0][1]))).toEqual(output);
});

it('masks inherited credentials even when an agent printed one into its report', () => {
  const previous = process.env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY;
  process.env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY = 'a-secret-read-key';
  try {
    writeInvestigationArtifact('model', 'report', {
      conclusion: 'Unexpected output a-secret-read-key',
    });
    expect(write.mock.calls[0][1]).not.toContain('a-secret-read-key');
    expect(write.mock.calls[0][1]).toContain('[REDACTED]');
    expect(write.mock.calls[0][2]).toEqual({ mode: 0o600 });
  } finally {
    if (previous === undefined) delete process.env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY;
    else process.env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY = previous;
  }
});
