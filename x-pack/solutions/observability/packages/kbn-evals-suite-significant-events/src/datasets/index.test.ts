/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INCIDENTS_NAMESPACE,
  OTEL_DEMO_NAMESPACE,
  QUARKUS_SUPER_HEROES_NAMESPACE,
} from '../constants';
import {
  getAllDatasetIds,
  getDatasetById,
  getDefaultDatasetIds,
  hasExplicitDatasetSelection,
  resolveRequestedDatasets,
} from '.';

const getOptInDatasetIds = (): string[] =>
  getAllDatasetIds().filter((id) => getDatasetById(id)?.optIn);

const resolveRequestedDatasetIds = (selectedDatasets: string | undefined): string[] =>
  resolveRequestedDatasets(selectedDatasets).map(({ id }) => id);

describe('dataset registry', () => {
  it('marks incidents as the only opt-in dataset', () => {
    expect(getOptInDatasetIds()).toEqual([INCIDENTS_NAMESPACE]);
  });

  it('derives the defaults from the registry by dropping opt-in datasets', () => {
    expect(getDefaultDatasetIds()).not.toContain(INCIDENTS_NAMESPACE);
    expect(getDefaultDatasetIds()).toEqual(
      getAllDatasetIds().filter((id) => !getDatasetById(id)?.optIn)
    );
  });
});

describe('dataset selection', () => {
  it.each([undefined, '', '   '])(
    'selects the default datasets when the selection is %j',
    (selectedDatasets) => {
      expect(hasExplicitDatasetSelection(selectedDatasets)).toBe(false);
      expect(resolveRequestedDatasetIds(selectedDatasets)).toEqual(getDefaultDatasetIds());
      expect(resolveRequestedDatasetIds(selectedDatasets)).not.toContain(INCIDENTS_NAMESPACE);
    }
  );

  it('resolves selections to the registered dataset configs', () => {
    expect(resolveRequestedDatasets(INCIDENTS_NAMESPACE)).toEqual([
      getDatasetById(INCIDENTS_NAMESPACE),
    ]);
    expect(hasExplicitDatasetSelection(INCIDENTS_NAMESPACE)).toBe(true);
  });

  it.each(['all', `${INCIDENTS_NAMESPACE},all,${OTEL_DEMO_NAMESPACE}`])(
    'selects every registered dataset, opt-in datasets included, when the selection is %j',
    (selectedDatasets) => {
      expect(hasExplicitDatasetSelection(selectedDatasets)).toBe(true);
      expect(resolveRequestedDatasetIds(selectedDatasets)).toEqual(getAllDatasetIds());
      expect(resolveRequestedDatasetIds(selectedDatasets)).toContain(INCIDENTS_NAMESPACE);
    }
  );

  it('trims, preserves order, and deduplicates explicit dataset ids', () => {
    const selectedDatasets = ` ${INCIDENTS_NAMESPACE}, ${QUARKUS_SUPER_HEROES_NAMESPACE}, ${INCIDENTS_NAMESPACE}, ${OTEL_DEMO_NAMESPACE} `;

    expect(hasExplicitDatasetSelection(selectedDatasets)).toBe(true);
    expect(resolveRequestedDatasetIds(selectedDatasets)).toEqual([
      INCIDENTS_NAMESPACE,
      QUARKUS_SUPER_HEROES_NAMESPACE,
      OTEL_DEMO_NAMESPACE,
    ]);
  });

  it('reports unknown and available dataset ids without naming a caller', () => {
    expect(() => resolveRequestedDatasets('missing-dataset')).toThrow(
      `Unknown dataset(s): missing-dataset. Available: ${getAllDatasetIds().join(', ')}.`
    );
    expect(() => resolveRequestedDatasets('missing-dataset')).not.toThrow(/SIGEVENTS_DATASET/);
    expect(() => resolveRequestedDatasets('missing-dataset')).not.toThrow(/--dataset/);
  });
});
