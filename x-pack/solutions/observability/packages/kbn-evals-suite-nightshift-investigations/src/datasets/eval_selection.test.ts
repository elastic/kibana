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
        runSmoke: true,
        runInvestigations: true,
        smokeDatasetsRequest: undefined,
        fellBackToSmoke: false,
      });
    });

    it('falls back to smoke without credentials', () => {
      expect(resolveEvalSelection({})).toEqual({
        runSmoke: true,
        runInvestigations: false,
        smokeDatasetsRequest: undefined,
        fellBackToSmoke: true,
      });
    });
  });

  it('treats all like unset, including inside a list', () => {
    for (const value of ['all', ' all ', 'synthetic-smoke,all']) {
      expect(resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: value })).toMatchObject({
        runSmoke: true,
        runInvestigations: true,
        smokeDatasetsRequest: undefined,
      });
    }
  });

  it('runs only the investigation eval for trace-only', () => {
    expect(resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: 'trace-only' })).toEqual({
      runSmoke: false,
      runInvestigations: true,
      smokeDatasetsRequest: undefined,
      fellBackToSmoke: false,
    });
  });

  it('runs only the named smoke datasets, trimmed, and needs no credentials', () => {
    expect(resolveEvalSelection({ NIGHTSHIFT_DATASETS: ' synthetic-smoke ' })).toEqual({
      runSmoke: true,
      runInvestigations: false,
      smokeDatasetsRequest: 'synthetic-smoke',
      fellBackToSmoke: false,
    });
  });

  it('combines smoke datasets and the investigation eval in one list', () => {
    expect(
      resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: 'synthetic-smoke, trace-only' })
    ).toEqual({
      runSmoke: true,
      runInvestigations: true,
      smokeDatasetsRequest: 'synthetic-smoke',
      fellBackToSmoke: false,
    });
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
      resolveEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASET_ID: 'stored' })
    ).toMatchObject({ runSmoke: false, runInvestigations: true });
    expect(
      resolveEvalSelection({
        ...WITH_SANDBOX,
        NIGHTSHIFT_DATASET_ID: 'stored',
        NIGHTSHIFT_DATASETS: 'synthetic-smoke',
      })
    ).toMatchObject({ runSmoke: true, runInvestigations: false });
    expect(() => resolveEvalSelection({ NIGHTSHIFT_DATASET_ID: 'stored' })).toThrow(
      'SANDBOX_API_KEY is required'
    );
  });
});
