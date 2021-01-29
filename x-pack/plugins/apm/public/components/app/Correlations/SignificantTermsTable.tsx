/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiIcon, EuiLink } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { EuiBasicTable } from '@elastic/eui';
import { EuiBasicTableColumn } from '@elastic/eui';
import { EuiCode } from '@elastic/eui';
import { asInteger, asPercent } from '../../../../common/utils/formatters';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { createHref, push } from '../../shared/Links/url_helpers';

type CorrelationsApiResponse =
  | APIReturnType<'GET /api/apm/correlations/failed_transactions'>
  | APIReturnType<'GET /api/apm/correlations/slow_transactions'>;

type SignificantTerm = NonNullable<
  NonNullable<CorrelationsApiResponse>['significantTerms']
>[0];

interface Props<T> {
  significantTerms?: T[];
  status: FETCH_STATUS;
  cardinalityColumnName: string;
  setSelectedSignificantTerm: (term: T | null) => void;
}

export function SignificantTermsTable<T extends SignificantTerm>({
  significantTerms,
  status,
  cardinalityColumnName,
  setSelectedSignificantTerm,
}: Props<T>) {
  const history = useHistory();
  const columns: Array<EuiBasicTableColumn<T>> = [
    {
      width: '100px',
      field: 'score',
      name: 'Score',
      render: (_: any, term: T) => {
        return <EuiCode>{Math.round(term.score)}</EuiCode>;
      },
    },
    {
      field: 'cardinality',
      name: cardinalityColumnName,
      render: (_: any, term: T) => {
        const matches = asPercent(term.fgCount, term.bgCount);
        return `${asInteger(term.fgCount)} (${matches})`;
      },
    },
    {
      field: 'fieldName',
      name: 'Field name',
    },
    {
      field: 'fieldValue',
      name: 'Field value',
      render: (_: any, term: T) => String(term.fieldValue).slice(0, 50),
    },
    {
      width: '100px',
      actions: [
        {
          name: 'Focus',
          description: 'Focus on this term',
          icon: 'magnifyWithPlus',
          type: 'icon',
          onClick: (term: T) => {
            push(history, {
              query: {
                kuery: `${term.fieldName}:"${encodeURIComponent(
                  term.fieldValue
                )}"`,
              },
            });
          },
        },
        {
          name: 'Exclude',
          description: 'Exclude this term',
          icon: 'magnifyWithMinus',
          type: 'icon',
          onClick: (term: T) => {
            push(history, {
              query: {
                kuery: `not ${term.fieldName}:"${encodeURIComponent(
                  term.fieldValue
                )}"`,
              },
            });
          },
        },
      ],
      name: 'Actions',
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
            &nbsp;/&nbsp;
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
