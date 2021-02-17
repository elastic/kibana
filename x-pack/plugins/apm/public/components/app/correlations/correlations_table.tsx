/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { debounce } from 'lodash';
import {
  EuiIcon,
  EuiLink,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { asInteger, asPercent } from '../../../../common/utils/formatters';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { createHref, push } from '../../shared/Links/url_helpers';
import { ImpactBar } from '../../shared/ImpactBar';
import { useUiTracker } from '../../../../../observability/public';

type CorrelationsApiResponse =
  | APIReturnType<'GET /api/apm/correlations/failed_transactions'>
  | APIReturnType<'GET /api/apm/correlations/slow_transactions'>;

type SignificantTerm = NonNullable<
  NonNullable<CorrelationsApiResponse>['significantTerms']
>[0];

interface Props<T> {
  significantTerms?: T[];
  status: FETCH_STATUS;
  percentageColumnName: string;
  setSelectedSignificantTerm: (term: T | null) => void;
  onFilter: () => void;
}

export function CorrelationsTable<T extends SignificantTerm>({
  significantTerms,
  status,
  percentageColumnName,
  setSelectedSignificantTerm,
  onFilter,
}: Props<T>) {
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const trackSelectSignificantTerm = useCallback(
    () =>
      debounce(
        () => trackApmEvent({ metric: 'select_significant_term' }),
        1000
      ),
    [trackApmEvent]
  );
  const history = useHistory();
  const columns: Array<EuiBasicTableColumn<T>> = [
    {
      width: '100px',
      field: 'impact',
      name: i18n.translate(
        'xpack.apm.correlations.correlationsTable.impactLabel',
        { defaultMessage: 'Impact' }
      ),
      render: (_: any, term: T) => {
        return <ImpactBar value={term.impact * 100} />;
      },
    },
    {
      field: 'percentage',
      name: percentageColumnName,
      render: (_: any, term: T) => {
        return (
          <EuiToolTip
            position="right"
            content={`${asInteger(term.valueCount)} / ${asInteger(
              term.fieldCount
            )}`}
          >
            <>{asPercent(term.valueCount, term.fieldCount)}</>
          </EuiToolTip>
        );
      },
    },
    {
      field: 'fieldName',
      name: i18n.translate(
        'xpack.apm.correlations.correlationsTable.fieldNameLabel',
        { defaultMessage: 'Field name' }
      ),
    },
    {
      field: 'fieldValue',
      name: i18n.translate(
        'xpack.apm.correlations.correlationsTable.fieldValueLabel',
        { defaultMessage: 'Field value' }
      ),
      render: (_: any, term: T) => String(term.fieldValue).slice(0, 50),
    },
    {
      width: '100px',
      actions: [
        {
          name: i18n.translate(
            'xpack.apm.correlations.correlationsTable.filterLabel',
            { defaultMessage: 'Filter' }
          ),
          description: i18n.translate(
            'xpack.apm.correlations.correlationsTable.filterDescription',
            { defaultMessage: 'Filter by value' }
          ),
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
            onFilter();
            trackApmEvent({ metric: 'correlations_term_include_filter' });
          },
        },
        {
          name: i18n.translate(
            'xpack.apm.correlations.correlationsTable.excludeLabel',
            { defaultMessage: 'Exclude' }
          ),
          description: i18n.translate(
            'xpack.apm.correlations.correlationsTable.excludeDescription',
            { defaultMessage: 'Filter out value' }
          ),
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
            onFilter();
            trackApmEvent({ metric: 'correlations_term_exclude_filter' });
          },
        },
      ],
      name: i18n.translate(
        'xpack.apm.correlations.correlationsTable.actionsLabel',
        { defaultMessage: 'Actions' }
      ),
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
      noItemsMessage={
        status === FETCH_STATUS.LOADING ? loadingText : noDataText
      }
      loading={status === FETCH_STATUS.LOADING}
      columns={columns}
      rowProps={(term) => {
        return {
          onMouseEnter: () => {
            setSelectedSignificantTerm(term);
            trackSelectSignificantTerm();
          },
          onMouseLeave: () => setSelectedSignificantTerm(null),
        };
      }}
    />
  );
}

const loadingText = i18n.translate(
  'xpack.apm.correlations.correlationsTable.loadingText',
  { defaultMessage: 'Loading' }
);

const noDataText = i18n.translate(
  'xpack.apm.correlations.correlationsTable.noDataText',
  { defaultMessage: 'No data' }
);
