/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectAttributes,
  SavedObjectReference,
  SavedObjectUnsanitizedDoc,
} from 'kibana/server';
import { AlertTypeParams } from '../../index';
import { Query } from '../../../../../../src/plugins/data/common/query';
import { RawAlert } from '../../types';

export const GEO_CONTAINMENT_ID = '.geo-containment';

export interface GeoContainmentParams extends AlertTypeParams {
  index: string;
  indexId: string;
  geoField: string;
  entity: string;
  dateField: string;
  boundaryType: string;
  boundaryIndexTitle: string;
  boundaryIndexId: string;
  boundaryGeoField: string;
  boundaryNameField?: string;
  indexQuery?: Query;
  boundaryIndexQuery?: Query;
}

export type GeoContainmentExtractedParams = Omit<
  GeoContainmentParams,
  'indexId' | 'boundaryIndexId'
> & {
  indexRefName: string;
  boundaryIndexRefName: string;
};

export function extractEntityAndBoundaryReferences(params: GeoContainmentParams): {
  params: GeoContainmentExtractedParams;
  references: SavedObjectReference[];
} {
  const { indexId, boundaryIndexId, ...otherParams } = params;
  const references = [
    {
      name: `tracked_index_${indexId}`,
      type: 'index-pattern',
      id: indexId as string,
    },
    {
      name: `boundary_index_${boundaryIndexId}`,
      type: 'index-pattern',
      id: boundaryIndexId as string,
    },
  ];
  return {
    params: {
      ...otherParams,
      indexRefName: `tracked_index_${indexId}`,
      boundaryIndexRefName: `boundary_index_${boundaryIndexId}`,
    },
    references,
  };
}

export function injectEntityAndBoundaryIds(
  params: GeoContainmentExtractedParams,
  references: SavedObjectReference[]
): GeoContainmentParams {
  const { indexRefName, boundaryIndexRefName, ...otherParams } = params;
  const { id: indexId = null } = references.find((ref) => ref.name === indexRefName) || {};
  const { id: boundaryIndexId = null } =
    references.find((ref) => ref.name === boundaryIndexRefName) || {};
  if (!indexId) {
    throw new Error(`Index "${indexId}" not found in references array`);
  }
  if (!boundaryIndexId) {
    throw new Error(`Boundary index "${boundaryIndexId}" not found in references array`);
  }
  return {
    ...otherParams,
    indexId,
    boundaryIndexId,
  } as GeoContainmentParams;
}

export function extractRefsFromGeoContainmentAlert(
  doc: SavedObjectUnsanitizedDoc<RawAlert>
): SavedObjectUnsanitizedDoc<RawAlert> {
  if (doc.attributes.alertTypeId !== GEO_CONTAINMENT_ID) {
    return doc;
  }

  const {
    attributes: { params },
  } = doc;

  const { params: newParams, references } = extractEntityAndBoundaryReferences(
    params as GeoContainmentParams
  );
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      params: newParams as SavedObjectAttributes,
    },
    references,
  };
}
