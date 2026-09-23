/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ALL_DATASETS = 'all';

/** Parses `NIGHTSHIFT_DATASETS`; returns `undefined` when every registered dataset should run. */
export const parseRequestedIds = (requested: string | undefined): string[] | undefined => {
  const normalized = requested?.trim();

  if (!normalized || normalized === ALL_DATASETS) {
    return undefined;
  }

  const ids = [...new Set(normalized.split(',').map((id) => id.trim()))];

  if (ids.some((id) => id.length === 0)) {
    throw new Error(
      'NIGHTSHIFT_DATASETS contains an empty item; expected a comma-separated list of dataset ids.'
    );
  }

  return ids.includes(ALL_DATASETS) ? undefined : ids;
};

/**
 * Narrows a registry to the requested comma-separated ids (`undefined` means all), in registry
 * order. Unknown ids throw rather than silently running a subset.
 */
export const selectDatasets = <TDataset extends { id: string }>(
  registry: readonly TDataset[],
  requested: string | undefined
): TDataset[] => {
  const requestedIds = parseRequestedIds(requested);

  if (!requestedIds) {
    return [...registry];
  }

  const availableIds = registry.map((dataset) => dataset.id);
  const unknownIds = requestedIds.filter((id) => !availableIds.includes(id));

  if (unknownIds.length > 0) {
    throw new Error(
      `Unknown dataset(s) in NIGHTSHIFT_DATASETS: ${unknownIds.join(', ')}. ` +
        `Available: ${availableIds.join(', ')}, or "${ALL_DATASETS}" to run every dataset.`
    );
  }

  return registry.filter((dataset) => requestedIds.includes(dataset.id));
};
