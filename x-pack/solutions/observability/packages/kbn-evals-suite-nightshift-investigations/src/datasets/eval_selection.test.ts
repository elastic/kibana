/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveEvalSelection } from './eval_selection';

const WITH_SANDBOX = { SANDBOX_API_KEY: 'key' };

describe('resolveEvalSelection', () => {
  describe('when NIGHTSHIFT_DATASETS is unset', () => {
    it.each([
      ['unset', undefined],
      ['empty', ''],
      ['whitespace', '   '],
    ])('runs every eval with credentials (%s)', (_label, value) => {
      expect(resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: value })).toEqual({
        runOrca: false,
        runSmoke: true,
        runInvestigations: true,
        runConnectorProbes: false,
        smokeDatasetsRequest: undefined,
        fellBackToSmoke: false,
      });
    });

    it('falls back to smoke without credentials', () => {
      expect(resolveEvalSelection({})).toEqual({
        runOrca: false,
        runSmoke: true,
        runInvestigations: false,
        runConnectorProbes: false,
        smokeDatasetsRequest: undefined,
        fellBackToSmoke: true,
      });
    });
  });

  it('treats all like unset, including inside a list', () => {
    for (const value of ['all', ' all ', 'synthetic-smoke,all']) {
      expect(resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: value })).toMatchObject({
        runOrca: false,
        runSmoke: true,
        runInvestigations: true,
        smokeDatasetsRequest: undefined,
      });
    }
  });

  it('runs only the investigation eval for trace-only', () => {
    expect(resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: 'trace-only' })).toEqual({
      runOrca: false,
      runSmoke: false,
      runInvestigations: true,
      runConnectorProbes: false,
      smokeDatasetsRequest: undefined,
      fellBackToSmoke: false,
    });
  });

  it('runs only the named smoke datasets, trimmed, and needs no credentials', () => {
    expect(resolveEvalSelection({ NIGHTSHIFT_DATASETS: ' synthetic-smoke ' })).toEqual({
      runOrca: false,
      runSmoke: true,
      runInvestigations: false,
      runConnectorProbes: false,
      smokeDatasetsRequest: 'synthetic-smoke',
      fellBackToSmoke: false,
    });
  });

  it('combines smoke datasets and the investigation eval in one list', () => {
    expect(
      resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: 'synthetic-smoke, trace-only' })
    ).toEqual({
      runOrca: false,
      runSmoke: true,
      runInvestigations: true,
      runConnectorProbes: false,
      smokeDatasetsRequest: 'synthetic-smoke',
      fellBackToSmoke: false,
    });
  });

  it('runs only the connector probes for connector-probe', () => {
    expect(
      resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: 'connector-probe' })
    ).toEqual({
      runOrca: false,
      runSmoke: false,
      runInvestigations: false,
      runConnectorProbes: true,
      smokeDatasetsRequest: undefined,
      fellBackToSmoke: false,
    });
  });

  it('never selects the connector probes for all', () => {
    expect(resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: 'all' })).toMatchObject({
      runConnectorProbes: false,
    });
  });

  it('rejects connector-probe without credentials', () => {
    expect(() => resolveEvalSelection({ NIGHTSHIFT_DATASETS: 'connector-probe' })).toThrow(
      'NIGHTSHIFT_DATASETS=connector-probe selects connector-probe'
    );
  });

  it.each(['trace-only', 'synthetic-smoke,trace-only'])(
    'rejects %s without credentials, even when Scout would be reused',
    (value) => {
      expect(() => resolveEvalSelection({ NIGHTSHIFT_DATASETS: value })).toThrow(
        `NIGHTSHIFT_DATASETS=${value} selects trace-only, which runs investigation evals, but SANDBOX_API_KEY is required`
      );
    }
  );

  it.each(['all', ' all ', 'synthetic-smoke,all'])(
    'rejects an explicit %s without credentials instead of silently running only smoke',
    (value) => {
      expect(() => resolveEvalSelection({ NIGHTSHIFT_DATASETS: value })).toThrow(
        `NIGHTSHIFT_DATASETS=${value.trim()} selects all, which runs investigation evals, but SANDBOX_API_KEY is required`
      );
    }
  );

  it('rejects empty list items like selectDatasets does', () => {
    expect(() => resolveEvalSelection({ NIGHTSHIFT_DATASETS: 'synthetic-smoke,,' })).toThrow(
      'NIGHTSHIFT_DATASETS contains an empty item'
    );
  });
  it('selects stored investigations by default without overriding explicit dataset selections', () => {
    expect(
      resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASET_NAME: 'stored' })
    ).toMatchObject({ runOrca: false, runSmoke: false, runInvestigations: true });
    expect(
      resolveEvalSelection({
        ...WITH_SANDBOX,
        NIGHTSHIFT_DATASET_NAME: 'stored',
        NIGHTSHIFT_DATASETS: 'synthetic-smoke',
      })
    ).toMatchObject({ runOrca: false, runSmoke: true, runInvestigations: false });
    expect(() => resolveEvalSelection({ NIGHTSHIFT_DATASET_NAME: 'stored' })).toThrow(
      'SANDBOX_API_KEY is required'
    );
  });
});

describe('ORCA selection', () => {
  const orcaEnv = { ...WITH_SANDBOX, NIGHTSHIFT_ORCA_TELEMETRY: '1' };
  it.each([{ EVAL_SHARD_ID: 'orcabench' }, { NIGHTSHIFT_DATASETS: 'orcabench' }])(
    'isolates the ORCA job from existing coverage: %j',
    (selection) => {
      expect(resolveEvalSelection({ ...orcaEnv, ...selection })).toMatchObject({
        runOrca: true,
        runSmoke: false,
        runInvestigations: false,
        runConnectorProbes: false,
      });
    }
  );
  it('rejects an ORCA run on a reused server with another telemetry target', () => {
    expect(() =>
      resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: 'orcabench' })
    ).toThrow('ORCA telemetry hook');
  });
  it('rejects mixed telemetry sources on one Scout server', () => {
    expect(() =>
      resolveEvalSelection({ ...orcaEnv, NIGHTSHIFT_DATASETS: 'trace-only,orcabench' })
    ).toThrow('own Scout server');
  });
});
