/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

type Hit = Record<string, any>;
type FlattenHitFn = (hit: Hit) => Record<string, string>;
type FlatHits = Record<string, string[]>;

// TODO this logic should be re-used with Discover
export function createFlattenHit(
  fields: string[],
  metaFields: string[],
  conflictedTypesFields: string[]
): FlattenHitFn {
  const flattenSource = (flat: FlatHits, obj: object, keyPrefix = '') => {
    keyPrefix = keyPrefix ? keyPrefix + '.' : '';
    _.forOwn(obj, (val, key) => {
      key = keyPrefix + key;

      const hasValidMapping = fields.indexOf(key) >= 0 && conflictedTypesFields.indexOf(key) === -1;
      const isValue = !_.isPlainObject(val);

      if (hasValidMapping || isValue) {
        if (!flat[key]) {
          flat[key] = val;
        } else if (_.isArray(flat[key])) {
          flat[key].push(val);
        } else {
          flat[key] = [flat[key], val] as any;
        }
        return;
      }

      flattenSource(flat, val, key);
    });
  };

  const flattenMetaFields = (flat: Hit, hit: Hit) => {
    _.each(metaFields, (meta) => {
      if (meta === '_source') return;
      flat[meta] = hit[meta];
    });
  };

  const flattenFields = (flat: FlatHits, hitFields: string[]) => {
    _.forOwn(hitFields, (val, key) => {
      if (key) {
        if (key[0] === '_' && !_.includes(metaFields, key)) return;
        flat[key] = _.isArray(val) && val.length === 1 ? val[0] : val;
      }
    });
  };

  return function flattenHit(hit) {
    const flat = {};
    flattenSource(flat, hit._source);
    flattenMetaFields(flat, hit);
    flattenFields(flat, hit.fields);
    return flat;
  };
}
