/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { EvalsClient } from '@kbn/evals';
import type { OrcaRubric } from './check_prediction';
import type { ORCA_RUBRICS_RELEASE } from './rubrics';
import { getOrcaRubrics, getOrcaRubricsHash, loadOrcaRubrics } from './rubrics';

const synthetic: Record<string, OrcaRubric> = JSON.parse(
  readFileSync(join(__dirname, '__fixtures__', 'synthetic_rubrics.json'), 'utf8')
);
const rubrics = new Map(Object.entries(synthetic));
const release = {
  id: 'rubrics',
  name: 'nightshift/orca-bench-rubrics-test',
  examples: rubrics.size,
  sha256: getOrcaRubricsHash(rubrics),
} as unknown as typeof ORCA_RUBRICS_RELEASE;

const clientWith = (examples: Array<{ input: object; output: object }>, id = 'rubrics') =>
  ({
    getDatasetByName: jest.fn().mockResolvedValue({ id, name: release.name, examples }),
  } as unknown as Pick<EvalsClient, 'getDatasetByName'>);

const examples = [...rubrics].map(([eventId, rubric]) => ({
  input: { event_id: eventId },
  output: { rubric },
}));

describe('ORCA rubrics', () => {
  it('loads the pinned release keyed by event id, whatever the example order', async () => {
    const loaded = await loadOrcaRubrics(clientWith([...examples].reverse()), release);
    expect(new Set(loaded.keys())).toEqual(new Set(rubrics.keys()));
    expect(loaded.get('synthetic-quietFlag-on')).toEqual(synthetic['synthetic-quietFlag-on']);
  });

  it('refuses another dataset or changed content', async () => {
    await expect(loadOrcaRubrics(clientWith(examples, 'other'), release)).rejects.toThrow(
      'identity differs'
    );
    const changed = examples.map((example, index) =>
      index === 0 ? { ...example, output: { rubric: { feature_flag: 'x' } } } : example
    );
    await expect(loadOrcaRubrics(clientWith(changed), release)).rejects.toThrow('content differs');
    await expect(loadOrcaRubrics(clientWith(examples.slice(1)), release)).rejects.toThrow(
      'distinct event ids'
    );
  });

  it('orders an incident rubrics by file name, as the verifier loads them', () => {
    const result = getOrcaRubrics(
      {
        events: ['synthetic-synthLatency-50%', 'synthetic-cartOutage-on'].map((eventId) => ({
          event_id: eventId,
          root_cause: '',
          event_time: '',
        })),
      },
      rubrics
    );
    expect('rubrics' in result && result.rubrics.map(({ feature_flag: flag }) => flag)).toEqual([
      'cartOutage',
      'synthLatency',
    ]);
  });
});
