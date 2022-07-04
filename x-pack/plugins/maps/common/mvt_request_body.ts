/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RisonValue } from 'rison-node';
import rison from 'rison-node';
import { RENDER_AS } from './constants';

export function decodeMvtResponseBody(encodedRequestBody: string): object {
  return rison.decode(decodeURIComponent(encodedRequestBody).replace('%25', '%')) as object;
}

export function encodeMvtResponseBody(unencodedRequestBody: object): string {
  // URL encoding replaces unsafe ASCII characters with a '%' followed by two hexadecimal digits
  // encodeURIComponent does not encode '%'
  // This causes preexisting '%' to break decoding because they are not valid URL encoding
  // To prevent this, properly url encode '%' before calling encodeURIComponent
  return encodeURIComponent(rison.encode(unencodedRequestBody as RisonValue).replace('%', '%25'));
}

export function getAggsTileRequest({
  encodedRequestBody,
  geometryFieldName,
  gridPrecision,
  hasLabels,
  index,
  renderAs = RENDER_AS.POINT,
  x,
  y,
  z,
}: {
  encodedRequestBody: string;
  geometryFieldName: string;
  gridPrecision: number;
  hasLabels: boolean;
  index: string;
  renderAs: RENDER_AS;
  x: number;
  y: number;
  z: number;
}) {
  const requestBody = decodeMvtResponseBody(encodedRequestBody) as any;
  return {
    path: `/${encodeURIComponent(index)}/_mvt/${geometryFieldName}/${z}/${x}/${y}`,
    body: {
      size: 0, // no hits
      grid_precision: gridPrecision,
      exact_bounds: false,
      extent: 4096, // full resolution,
      query: requestBody.query,
      grid_agg: renderAs === RENDER_AS.HEX ? 'geohex' : 'geotile',
      grid_type: renderAs === RENDER_AS.GRID || renderAs === RENDER_AS.HEX ? 'grid' : 'centroid',
      aggs: requestBody.aggs,
      fields: requestBody.fields,
      runtime_mappings: requestBody.runtime_mappings,
      with_labels: hasLabels,
    },
  };
}

export function getHitsTileRequest({
  encodedRequestBody,
  geometryFieldName,
  hasLabels,
  index,
  x,
  y,
  z,
}: {
  encodedRequestBody: string;
  geometryFieldName: string;
  hasLabels: boolean;
  index: string;
  x: number;
  y: number;
  z: number;
}) {
  const requestBody = decodeMvtResponseBody(encodedRequestBody) as any;
  return {
    path: `/${encodeURIComponent(index)}/_mvt/${geometryFieldName}/${z}/${x}/${y}`,
    body: {
      grid_precision: 0, // no aggs
      exact_bounds: true,
      extent: 4096, // full resolution,
      query: requestBody.query,
      fields: mergeFields(
        [
          requestBody.docvalue_fields as Field[] | undefined,
          requestBody.stored_fields as Field[] | undefined,
        ],
        [geometryFieldName]
      ),
      runtime_mappings: requestBody.runtime_mappings,
      track_total_hits: typeof requestBody.size === 'number' ? requestBody.size + 1 : false,
      with_labels: hasLabels,
    },
  };
}

// can not use "import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey"
// SearchRequest is incorrectly typed and does not support Field as object
// https://github.com/elastic/elasticsearch-js/issues/1615
type Field =
  | string
  | {
      field: string;
      format: string;
    };

function mergeFields(fieldsList: Array<Field[] | undefined>, excludeNames: string[]): Field[] {
  const fieldNames: string[] = [];
  const mergedFields: Field[] = [];

  fieldsList.forEach((fields) => {
    if (!fields) {
      return;
    }

    fields.forEach((field) => {
      const fieldName = typeof field === 'string' ? field : field.field;
      if (!excludeNames.includes(fieldName) && !fieldNames.includes(fieldName)) {
        fieldNames.push(fieldName);
        mergedFields.push(field);
      }
    });
  });

  return mergedFields;
}
