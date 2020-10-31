/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiBadge,
  EuiIcon,
  EuiToolTip,
  EuiLoadingChart,
  EuiLink,
} from '@elastic/eui';
import styled from 'styled-components';
import { isEmpty } from 'lodash';
import { useHistory } from 'react-router-dom';
import { asPercent, asInteger } from '../../../../common/utils/formatters';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { FETCH_STATUS } from '../../../hooks/useFetcher';
import { createHref } from '../../shared/Links/url_helpers';

type CorrelationsApiResponse =
  | APIReturnType<'/api/apm/correlations/failed_transactions', 'GET'>
  | APIReturnType<'/api/apm/correlations/slow_transactions', 'GET'>;

type SignificantTerm = NonNullable<
  CorrelationsApiResponse
>['significantTerms'][0];

const TableRow = styled.tr`
  border-bottom: 1px solid #aaa;
  border-top: 1px solid #aaa;
  padding: 5px;

  &:hover {
    background: #eee;
  }
`;

const TableCell = styled.td`
  padding: 10px;

  // first column
  &:first-child {
    width: 1px;
    white-space: nowrap;
  }
`;

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
  return (
    <table>
      <thead>
        <tr>
          <TableCell>
            <strong>Matches</strong>
          </TableCell>
          <TableCell>
            <strong>Field name</strong>
          </TableCell>
          <TableCell>
            <strong>Field value</strong>
          </TableCell>
          <TableCell>&nbsp;</TableCell>
        </tr>
      </thead>
      <TableBody
        significantTerms={significantTerms}
        status={status}
        setSelectedSignificantTerm={setSelectedSignificantTerm}
      />
    </table>
  );
}

function TableBody<T extends SignificantTerm>({
  significantTerms,
  status,
  setSelectedSignificantTerm,
}: Props<T>) {
  const history = useHistory();
  if (isEmpty(significantTerms)) {
    return (
      <tbody>
        <TableRow>
          <TableCell>
            {status === FETCH_STATUS.LOADING ? (
              <EuiLoadingChart size="m" />
            ) : (
              'No data'
            )}
          </TableCell>
        </TableRow>
      </tbody>
    );
  }

  return (
    <tbody>
      {significantTerms?.map((term) => (
        <TableRow
          key={`${term.fieldName}_${term.fieldValue}`}
          onMouseEnter={() => setSelectedSignificantTerm(term)}
          onMouseLeave={() => setSelectedSignificantTerm(null)}
        >
          <TableCell>
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
          </TableCell>
          <TableCell>
            <h4>{term.fieldName}</h4>
          </TableCell>
          <TableCell>{String(term.fieldValue).slice(0, 50)}</TableCell>
          <TableCell>
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
          </TableCell>
        </TableRow>
      ))}
    </tbody>
  );
}
