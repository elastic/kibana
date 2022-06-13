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
} from '@kbn/core/server';
import { Query } from '@kbn/data-plugin/common/query';
import { RuleTypeParams } from '../..';
import { RawRule } from '../../types';

// These definitions are dupes of the SO-types in stack_alerts/geo_containment
// There are not exported to avoid deep imports from stack_alerts plugins into here
const GEO_CONTAINMENT_ID = '.geo-containment';
interface GeoContainmentParams extends RuleTypeParams {
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
type GeoContainmentExtractedParams = Omit<GeoContainmentParams, 'indexId' | 'boundaryIndexId'> & {
  indexRefName: string;
  boundaryIndexRefName: string;
};

export function extractEntityAndBoundaryReferences(params: GeoContainmentParams): {
  params: GeoContainmentExtractedParams;
  references: SavedObjectReference[];
} {
  const { indexId, boundaryIndexId, ...otherParams } = params;

  const indexRefNamePrefix = 'tracked_index_';
  const boundaryRefNamePrefix = 'boundary_index_';

  // Since these are stack-alerts, we need to prefix with the `param:`-namespace
  const references = [
    {
      name: `param:${indexRefNamePrefix}${indexId}`,
      type: `index-pattern`,
      id: indexId as string,
    },
    {
      name: `param:${boundaryRefNamePrefix}${boundaryIndexId}`,
      type: 'index-pattern',
      id: boundaryIndexId as string,
    },
  ];
  return {
    params: {
      ...otherParams,
      indexRefName: `${indexRefNamePrefix}${indexId}`,
      boundaryIndexRefName: `${boundaryRefNamePrefix}${boundaryIndexId}`,
    },
    references,
  };
}

export function extractRefsFromGeoContainmentAlert(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
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
    references: [...(doc.references || []), ...references],
  };
}
