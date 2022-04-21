/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, SearchFilterConfig } from '@elastic/eui';
import type { Clause, Value } from '@elastic/eui/src/components/search_bar/query/ast';
import { i18n } from '@kbn/i18n';
import {
  TRANSFORM_FUNCTION,
  TRANSFORM_MODE,
  TRANSFORM_STATE,
} from '../../../../../../common/constants';
import { isLatestTransform, isPivotTransform } from '../../../../../../common/types/transform';
import { TransformListRow } from '../../../../common';
import { getTaskStateBadge } from './use_columns';

export const transformFilters: SearchFilterConfig[] = [
  {
    type: 'field_value_selection',
    field: 'state.state',
    name: i18n.translate('xpack.transform.statusFilter', { defaultMessage: 'Status' }),
    multiSelect: 'or',
    options: Object.values(TRANSFORM_STATE).map((val) => ({
      value: val,
      name: val,
      view: getTaskStateBadge(val),
    })),
  },
  {
    type: 'field_value_selection',
    field: 'mode',
    name: i18n.translate('xpack.transform.modeFilter', { defaultMessage: 'Mode' }),
    multiSelect: false,
    options: Object.values(TRANSFORM_MODE).map((val) => ({
      value: val,
      name: val,
      view: (
        <EuiBadge className="transform__TaskModeBadge" color="hollow">
          {val}
        </EuiBadge>
      ),
    })),
  },
];

function stringMatch(str: string | undefined, substr: any) {
  return (
    typeof str === 'string' &&
    typeof substr === 'string' &&
    (str.toLowerCase().match(substr.toLowerCase()) === null) === false
  );
}

export const filterTransforms = (transforms: TransformListRow[], clauses: Clause[]) => {
  // keep count of the number of matches we make as we're looping over the clauses
  // we only want to return transforms which match all clauses, i.e. each search term is ANDed
  // { transform-one:  { transform: { id: transform-one, config: {}, state: {}, ... }, count: 0 }, transform-two: {...} }
  const matches: Record<string, any> = transforms.reduce((p: Record<string, any>, c) => {
    p[c.id] = {
      transform: c,
      count: 0,
    };
    return p;
  }, {});

  clauses.forEach((c) => {
    // the search term could be negated with a minus, e.g. -bananas
    const bool = c.match === 'must';
    let ts = [];

    if (c.type === 'term') {
      // filter term based clauses, e.g. bananas
      // match on ID and description
      // if the term has been negated, AND the matches
      if (bool === true) {
        ts = transforms.filter(
          (transform) =>
            stringMatch(transform.id, c.value) === bool ||
            stringMatch(transform.config.description, c.value) === bool
        );
      } else {
        ts = transforms.filter(
          (transform) =>
            stringMatch(transform.id, c.value) === bool &&
            stringMatch(transform.config.description, c.value) === bool
        );
      }
    } else {
      // filter other clauses, i.e. the mode and status filters
      if (c.type !== 'is' && Array.isArray(c.value)) {
        // the status value is an array of string(s) e.g. ['failed', 'stopped']
        ts = transforms.filter((transform) => (c.value as Value[]).includes(transform.stats.state));
      } else {
        ts = transforms.filter((transform) => {
          if (c.type === 'field' && c.field === 'mode') {
            return transform.mode === c.value;
          }
          if (c.type === 'field' && c.field === 'type') {
            if (c.value === TRANSFORM_FUNCTION.PIVOT) {
              return isPivotTransform(transform.config);
            }
            if (c.value === TRANSFORM_FUNCTION.LATEST) {
              return isLatestTransform(transform.config);
            }
          }
          return false;
        });
      }
    }

    ts.forEach((t) => matches[t.id].count++);
  });

  // loop through the matches and return only transforms which have match all the clauses
  const filtered = Object.values(matches)
    .filter((m) => (m && m.count) >= clauses.length)
    .map((m) => m.transform);

  return filtered;
};
