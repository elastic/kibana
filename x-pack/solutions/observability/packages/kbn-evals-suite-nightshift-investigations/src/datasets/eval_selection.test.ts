/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveEvalSelection } from './eval_selection';

const WITH_SANDBOX = { SANDBOX_API_KEY: 'key' };

const NONE = {
  runOrca: false,
  runOrcaRegrade: false,
  runInvestigations: false,
  runConnectorProbes: false,
  runWikiOptimize: false,
  storedDatasetIds: [],
};

describe('resolveEvalSelection', () => {
  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['whitespace', '   '],
    ['all', 'all'],
    ['padded all', ' all '],
    ['all inside a list', 'trace-only,all'],
  ])('runs the investigation eval when NIGHTSHIFT_DATASETS is %s', (_label, value) => {
    expect(resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: value })).toEqual({
      ...NONE,
      runInvestigations: true,
    });
  });

  it.each([undefined, 'all'])(
    'rejects NIGHTSHIFT_DATASETS=%s without credentials, even when Scout would be reused',
    (value) => {
      expect(() => resolveEvalSelection({ NIGHTSHIFT_DATASETS: value })).toThrow(
        'NIGHTSHIFT_DATASETS=all selects all, which runs the Nightshift agents in the sandbox, but SANDBOX_API_KEY is required'
      );
    }
  );

  it('runs only the investigation eval for trace-only', () => {
    expect(resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: ' trace-only ' })).toEqual({
      ...NONE,
      runInvestigations: true,
    });
  });

  it('runs only the connector probes for connector-probe', () => {
    expect(
      resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: 'connector-probe' })
    ).toEqual({ ...NONE, runConnectorProbes: true });
  });

  it('runs only the Wiki optimizer replay for wiki-optimize, without credentials', () => {
    expect(resolveEvalSelection({ NIGHTSHIFT_DATASETS: 'wiki-optimize' })).toEqual({
      ...NONE,
      runWikiOptimize: true,
    });
  });

  it('combines evals in one list', () => {
    expect(
      resolveEvalSelection({
        ...WITH_SANDBOX,
        NIGHTSHIFT_DATASETS: 'trace-only, wiki-optimize',
      })
    ).toEqual({ ...NONE, runInvestigations: true, runWikiOptimize: true });
  });

  it('never selects the opt-in evals for unset or all', () => {
    for (const value of [undefined, 'all']) {
      expect(resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: value })).toMatchObject({
        runConnectorProbes: false,
        runWikiOptimize: false,
        storedDatasetIds: [],
      });
    }
  });

  it('rejects connector-probe without credentials', () => {
    expect(() => resolveEvalSelection({ NIGHTSHIFT_DATASETS: 'connector-probe' })).toThrow(
      'NIGHTSHIFT_DATASETS=connector-probe selects connector-probe'
    );
  });

  it('rejects trace-only without credentials', () => {
    expect(() => resolveEvalSelection({ NIGHTSHIFT_DATASETS: 'trace-only' })).toThrow(
      'NIGHTSHIFT_DATASETS=trace-only selects trace-only, which runs the Nightshift agents in the sandbox, but SANDBOX_API_KEY is required'
    );
  });

  it('rejects empty list items', () => {
    expect(() => resolveEvalSelection({ NIGHTSHIFT_DATASETS: 'trace-only,,' })).toThrow(
      'NIGHTSHIFT_DATASETS contains an empty item'
    );
  });

  it('rejects unknown ids, including the removed smoke dataset', () => {
    expect(() =>
      resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: 'trace-only,synthetic-smoke' })
    ).toThrow('Unknown dataset(s) in NIGHTSHIFT_DATASETS: synthetic-smoke');
  });

  it('selects stored investigations by default without overriding explicit dataset selections', () => {
    expect(
      resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASET_NAME: 'stored' })
    ).toMatchObject({ runOrca: false, runInvestigations: true });
    expect(
      resolveEvalSelection({
        ...WITH_SANDBOX,
        NIGHTSHIFT_DATASET_NAME: 'stored',
        NIGHTSHIFT_DATASETS: 'wiki-optimize',
      })
    ).toMatchObject({ runOrca: false, runWikiOptimize: true, runInvestigations: false });
    expect(() => resolveEvalSelection({ NIGHTSHIFT_DATASET_NAME: 'stored' })).toThrow(
      'SANDBOX_API_KEY is required'
    );
  });
});

describe('stored dataset selection', () => {
  const storedEnv = { ...WITH_SANDBOX, NIGHTSHIFT_CONNECTOR_SET: 'default' };

  it.each([
    ['customer0-golden', ['golden']],
    ['customer0-connector-probes', ['connector-elastic']],
  ])('runs only the stored datasets of the %s shard', (shardId, storedDatasetIds) => {
    expect(resolveEvalSelection({ ...storedEnv, EVAL_SHARD_ID: shardId })).toEqual({
      ...NONE,
      storedDatasetIds,
    });
  });

  it('lets other shards keep their NIGHTSHIFT_DATASETS selection', () => {
    expect(resolveEvalSelection({ ...WITH_SANDBOX, EVAL_SHARD_ID: 'other' })).toMatchObject({
      runInvestigations: true,
      storedDatasetIds: [],
    });
  });

  it('rejects a stored shard without credentials', () => {
    expect(() => resolveEvalSelection({ EVAL_SHARD_ID: 'customer0-golden' })).toThrow(
      'The customer0-golden shard requires SANDBOX_API_KEY'
    );
  });

  it('selects stored datasets by id locally, alongside other evals', () => {
    expect(
      resolveEvalSelection({ ...storedEnv, NIGHTSHIFT_DATASETS: 'trace-only,golden' })
    ).toEqual({ ...NONE, runInvestigations: true, storedDatasetIds: ['golden'] });
  });

  it('never selects stored datasets for unset or all', () => {
    for (const value of [undefined, 'all']) {
      expect(
        resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: value }).storedDatasetIds
      ).toEqual([]);
    }
  });

  it('rejects a stored dataset id without credentials', () => {
    expect(() => resolveEvalSelection({ NIGHTSHIFT_DATASETS: 'golden' })).toThrow(
      'NIGHTSHIFT_DATASETS=golden selects golden, which runs the Nightshift agents in the sandbox'
    );
  });

  it.each([{}, { NIGHTSHIFT_CONNECTOR_SET: 'orcabench' }])(
    'rejects a stored shard or id without the default connector set, so it cannot run blind: %j',
    (connectorSet) => {
      expect(() =>
        resolveEvalSelection({
          ...WITH_SANDBOX,
          ...connectorSet,
          EVAL_SHARD_ID: 'customer0-golden',
        })
      ).toThrow('The customer0-golden shard queries Customer-0 live and requires');
      expect(() =>
        resolveEvalSelection({ ...WITH_SANDBOX, ...connectorSet, NIGHTSHIFT_DATASETS: 'golden' })
      ).toThrow('NIGHTSHIFT_DATASETS=golden queries Customer-0 live and requires');
    }
  );
});

describe('ORCA selection', () => {
  const orcaEnv = { ...WITH_SANDBOX, NIGHTSHIFT_CONNECTOR_SET: 'orcabench' };
  it.each([{ EVAL_SHARD_ID: 'orcabench' }, { NIGHTSHIFT_DATASETS: 'orcabench' }])(
    'isolates the ORCA job from existing coverage: %j',
    (selection) => {
      expect(resolveEvalSelection({ ...orcaEnv, ...selection })).toEqual({
        ...NONE,
        runOrca: true,
      });
    }
  );
  it.each([{}, { NIGHTSHIFT_CONNECTOR_SET: 'default' }])(
    'rejects an ORCA run on a reused server with another connector set: %j',
    (connectorSet) => {
      expect(() =>
        resolveEvalSelection({ ...WITH_SANDBOX, ...connectorSet, NIGHTSHIFT_DATASETS: 'orcabench' })
      ).toThrow('orcabench connector set');
    }
  );
  it('rejects mixed connector sets on one Scout server', () => {
    expect(() =>
      resolveEvalSelection({ ...orcaEnv, NIGHTSHIFT_DATASETS: 'trace-only,orcabench' })
    ).toThrow('own Scout server');
  });
});

describe('ORCA re-grade selection', () => {
  it('runs only the re-grade, without sandbox credentials', () => {
    expect(
      resolveEvalSelection({
        NIGHTSHIFT_DATASETS: 'orcabench-regrade',
        NIGHTSHIFT_ORCA_REGRADE_EXPERIMENT: 'experiment',
      })
    ).toEqual({ ...NONE, runOrcaRegrade: true });
  });
  it('needs the experiment to re-grade', () => {
    expect(() => resolveEvalSelection({ NIGHTSHIFT_DATASETS: 'orcabench-regrade' })).toThrow(
      'NIGHTSHIFT_ORCA_REGRADE_EXPERIMENT'
    );
  });
  it('runs on its own', () => {
    expect(() =>
      resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: 'trace-only,orcabench-regrade' })
    ).toThrow('on its own');
  });
});
