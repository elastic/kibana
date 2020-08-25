/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Dispatch, SetStateAction, FC, Fragment, useState } from 'react';
import each from 'lodash/each';
import {
  EuiSearchBar,
  EuiSearchBarProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { stringMatch } from '../../../../../util/string_utils';

export function filterAnalytics(jobs: any, clauses: any) {
  if (clauses.length === 0) {
    return jobs;
  }

  // keep count of the number of matches we make as we're looping over the clauses
  // we only want to return jobs which match all clauses, i.e. each search term is ANDed
  const matches = jobs.reduce((p: any, c: any) => {
    p[c.id] = {
      job: c,
      count: 0,
    };
    return p;
  }, {});

  clauses.forEach((c) => {
    // the search term could be negated with a minus, e.g. -bananas
    const bool = c.match === 'must';
    let js = [];

    if (c.type === 'term') {
      // filter term based clauses, e.g. bananas
      // match on id, description and memory_status
      // if the term has been negated, AND the matches
      if (bool === true) {
        js = jobs.filter(
          (job: any) =>
            stringMatch(job.id, c.value) === bool ||
            stringMatch(job.description, c.value) === bool ||
            stringMatch(job.memory_status, c.value) === bool
        );
      } else {
        js = jobs.filter(
          (job: any) =>
            stringMatch(job.id, c.value) === bool &&
            stringMatch(job.description, c.value) === bool &&
            stringMatch(job.memory_status, c.value) === bool
        );
      }
    } else {
      // filter other clauses, i.e. the filters for type and status
      if (Array.isArray(c.value)) {
        // the job type value is an array of job types
        js = jobs.filter((job: any) => c.value.some((value: any) => value === job[c.field]));
      } else {
        // TODO
        // js = jobs.filter((job) => jobProperty(job, c.field) === c.value);
      }
    }

    js.forEach((j) => matches[j.id].count++);
  });

  // loop through the matches and return only those jobs which have match all the clauses
  const filteredJobs: any = [];
  each(matches, (m) => {
    if (m.count >= clauses.length) {
      filteredJobs.push(m.job);
    }
  });
  return filteredJobs;
}

function getError(error: any) {
  if (error) {
    return i18n.translate('xpack.ml.analyticList.searchBar.invalidSearchErrorMessage', {
      defaultMessage: 'Invalid search: {errorMessage}',
      values: { errorMessage: error.message },
    });
  }

  return '';
}

interface Props {
  filters: EuiSearchBarProps['filters'];
  searchQueryText: string;
  setQueryClauses: Dispatch<SetStateAction<any[]>>;
}

export const AnalyticsSearchBar: FC<Props> = ({ filters, searchQueryText, setQueryClauses }) => {
  const [errorMessage, setErrorMessage] = useState(null);

  const onChange: any = ({ query, error }: any) => {
    if (error) {
      setErrorMessage(error);
    } else {
      let clauses = [];
      if (query && query.ast !== undefined && query.ast.clauses !== undefined) {
        clauses = query.ast.clauses;
      }
      setQueryClauses(clauses);
      setErrorMessage(null);
    }
  };

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem data-test-subj="mlAnalyticsSearchBar" grow={false}>
        {searchQueryText === undefined && (
          <EuiSearchBar
            box={{
              incremental: true,
            }}
            filters={filters}
            onChange={onChange}
            className="mlAnalyitcsSearchBar"
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
            className="mlAnalyitcsSearchBar"
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
