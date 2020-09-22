/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Dispatch, SetStateAction, FC, Fragment, useState } from 'react';
import {
  EuiBadge,
  EuiSearchBar,
  EuiSearchBarProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  SearchFilterConfig,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TermClause, FieldClause, Value } from './common';
import { TRANSFORM_MODE, TRANSFORM_STATE } from '../../../../../../common/constants';
import { TransformListRow } from '../../../../common';
import { getTaskStateBadge } from './use_columns';

const filters: SearchFilterConfig[] = [
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

export const filterTransforms = (
  transforms: TransformListRow[],
  clauses: Array<TermClause | FieldClause>
) => {
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
      if (Array.isArray(c.value)) {
        // the status value is an array of string(s) e.g. ['failed', 'stopped']
        ts = transforms.filter((transform) => (c.value as Value[]).includes(transform.stats.state));
      } else {
        ts = transforms.filter((transform) => transform.mode === c.value);
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

function getError(errorMessage: string | null) {
  if (errorMessage) {
    return i18n.translate('xpack.transform.transformList.searchBar.invalidSearchErrorMessage', {
      defaultMessage: 'Invalid search: {errorMessage}',
      values: { errorMessage },
    });
  }

  return '';
}

interface Props {
  searchQueryText: string;
  setSearchQueryText: Dispatch<SetStateAction<string>>;
}

export const TransformSearchBar: FC<Props> = ({ searchQueryText, setSearchQueryText }) => {
  const [errorMessage, setErrorMessage] = useState<null | string>(null);

  const onChange: EuiSearchBarProps['onChange'] = ({ query, error }) => {
    if (error) {
      setErrorMessage(error.message);
    } else if (query !== null && query.text !== undefined) {
      setSearchQueryText(query.text);
      setErrorMessage(null);
    }
  };

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem data-test-subj="transformSearchBar" grow={false}>
        {searchQueryText === undefined && (
          <EuiSearchBar
            box={{
              incremental: true,
            }}
            filters={filters}
            onChange={onChange}
            className="transformSearchBar"
          />
        )}
        {searchQueryText !== undefined && (
          <EuiSearchBar
            box={{
              incremental: true,
            }}
            defaultQuery={searchQueryText}
            filters={filters}
            onChange={onChange}
            className="transformSearchBar"
          />
        )}
        <EuiFormRow
          fullWidth
          isInvalid={errorMessage !== null}
          error={getError(errorMessage)}
          style={{ maxHeight: '0px' }}
        >
          <Fragment />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
