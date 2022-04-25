/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHistory } from 'react-router-dom';
import { Query } from '@kbn/es-query';
import { allNavigationItems } from '../navigation/constants';
import { encodeQuery } from '../navigation/query_utils';
import { FindingsBaseURLQuery } from '../../pages/findings/types';

const getFindingsQuery = (queryValue: Query['query']): Pick<FindingsBaseURLQuery, 'query'> => {
  const query =
    typeof queryValue === 'string'
      ? queryValue
      : // TODO: use a tested query builder instead ASAP
        Object.entries(queryValue)
          .reduce<string[]>((a, [key, value]) => {
            a.push(`${key} : "${value}"`);
            return a;
          }, [])
          .join(' and ');

  return {
    query: {
      language: 'kuery',
      // NOTE: a query object is valid TS but throws on runtime
      query,
    },
  }!;
};

export const useNavigateFindings = () => {
  const history = useHistory();

  return (query?: Query['query']) => {
    history.push({
      pathname: allNavigationItems.findings.path,
      ...(query && { search: encodeQuery(getFindingsQuery(query)) }),
    });
  };
};
