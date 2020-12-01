/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBadge, EuiIcon, EuiToolTip, EuiLink } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { EuiBasicTable } from '@elastic/eui';
import { asPercent, asInteger } from '../../../../common/utils/formatters';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { FETCH_STATUS } from '../../../hooks/useFetcher';
import { createHref } from '../../shared/Links/url_helpers';

type CorrelationsApiResponse =
  | APIReturnType<'GET /api/apm/correlations/failed_transactions'>
  | APIReturnType<'GET /api/apm/correlations/slow_transactions'>;

type SignificantTerm = NonNullable<
  NonNullable<CorrelationsApiResponse>['significantTerms']
>[0];

interface Props<T> {
  significantTerms?: T[];
  status: FETCH_STATUS;
  setSelectedSignificantTerm: (term: T | null) => void;
}

export function SignificantTermsTable<T extends SignificantTerm>({
  significantTerms,
  status,
  setSelectedSignificantTerm,
}: Props<T>) {
  const history = useHistory();
  const columns = [
    {
      field: 'matches',
      name: 'Matches',
      render: (_: any, term: T) => {
        return (
          <EuiToolTip
            position="top"
            content={`(${asInteger(term.fgCount)} of ${asInteger(
              term.bgCount
            )} requests)`}
          >
            <>
              <EuiBadge
                color={
                  term.fgCount / term.bgCount > 0.03 ? 'primary' : 'secondary'
                }
              >
                {asPercent(term.fgCount, term.bgCount)}
              </EuiBadge>
              ({Math.round(term.score)})
            </>
          </EuiToolTip>
        );
      },
    },
    {
      field: 'fieldName',
      name: 'Field name',
    },
    {
      field: 'filedValue',
      name: 'Field value',
      render: (_: any, term: T) => String(term.fieldValue).slice(0, 50),
    },
    {
      field: 'filedValue',
      name: '',
      render: (_: any, term: T) => {
        return (
          <>
            <EuiLink
              href={createHref(history, {
                query: {
                  kuery: `${term.fieldName}:"${encodeURIComponent(
                    term.fieldValue
                  )}"`,
                },
              })}
            >
              <EuiIcon type="magnifyWithPlus" />
            </EuiLink>
            <EuiLink
              href={createHref(history, {
                query: {
                  kuery: `not ${term.fieldName}:"${encodeURIComponent(
                    term.fieldValue
                  )}"`,
                },
              })}
            >
              <EuiIcon type="magnifyWithMinus" />
            </EuiLink>
          </>
        );
      },
    },
  ];

  return (
    <EuiBasicTable
      items={significantTerms ?? []}
      noItemsMessage={status === FETCH_STATUS.LOADING ? 'Loading' : 'No data'}
      loading={status === FETCH_STATUS.LOADING}
      columns={columns}
      rowProps={(term) => {
        return {
          onMouseEnter: () => setSelectedSignificantTerm(term),
          onMouseLeave: () => setSelectedSignificantTerm(null),
        };
      }}
    />
  );
}
