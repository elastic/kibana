/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable } from '@kbn/expressions-plugin/common';
import type { DatasourcePublicAPI } from '../../../types';
import { UnifiedAxisExtentConfig } from './types';

/**
 * Returns true if the provided extent includes 0
 * @param extent
 * @returns boolean
 */
export function validateZeroInclusivityExtent(extent?: {
  lowerBound?: number;
  upperBound?: number;
}) {
  return (
    extent &&
    extent.lowerBound != null &&
    extent.upperBound != null &&
    extent.lowerBound <= 0 &&
    extent.upperBound >= 0
  );
}

/**
 * Returns true if the provided extent is a valid range
 * @param extent
 * @returns boolean
 */
export function validateAxisDomain(extents?: { lowerBound?: number; upperBound?: number }) {
  return (
    extents &&
    extents.lowerBound != null &&
    extents.upperBound != null &&
    extents.upperBound > extents.lowerBound
  );
}
/**
 * Returns true if the provided column is a numeric histogram dimension
 * @param extent
 * @returns boolean
 */
export function hasNumericHistogramDimension(
  datasourceLayer: DatasourcePublicAPI | undefined,
  columnId?: string
) {
  if (!columnId) {
    return false;
  }

  const operation = datasourceLayer?.getOperationForColumnId(columnId);

  return Boolean(operation && operation.dataType === 'number' && operation.scale === 'interval');
}

/**
 * Finds the table data min and max. Returns undefined when no min/max is found
 * @param layerId
 * @param tables
 * @param columnId
 * @returns
 */
export function getDataBounds(
  layerId: string,
  tables: Record<string, Datatable> | undefined,
  columnId?: string
) {
  const table = tables?.[layerId];
  if (columnId && table) {
    const sortedRows = table.rows
      .map(({ [columnId]: value }) => value)
      // ignore missing hit
      .filter((v) => v != null)
      .sort((a, b) => a - b);
    if (sortedRows.length) {
      return {
        min: sortedRows[0],
        max: sortedRows[sortedRows.length - 1],
      };
    }
  }
}

export function validateExtent(shouldIncludeZero: boolean, extent?: UnifiedAxisExtentConfig) {
  return {
    inclusiveZeroError: shouldIncludeZero && !validateZeroInclusivityExtent(extent),
    boundaryError: !validateAxisDomain(extent),
  };
}
