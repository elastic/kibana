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

export const FILTER_LABEL = i18n.translate(
  'xpack.apm.correlations.correlationsTable.filterLabel',
  { defaultMessage: 'Filter' }
);

export const FILTER_DESCRIPTION = i18n.translate(
  'xpack.apm.correlations.correlationsTable.filterDescription',
  { defaultMessage: 'Filter by value' }
);

export const FILTER_ACTION_LABEL = i18n.translate(
  'xpack.apm.correlations.correlationsTable.actionsLabel',
  { defaultMessage: 'Filter' }
);

export const EXCLUDE_ACTION_LABEL = i18n.translate(
  'xpack.apm.correlations.correlationsTable.excludeLabel',
  { defaultMessage: 'Exclude' }
);

export const EXCLUDE_ACTION_DESCRIPTION = i18n.translate(
  'xpack.apm.correlations.correlationsTable.excludeDescription',
  { defaultMessage: 'Filter out value' }
);

type CorrelationsApiResponse =
  | APIReturnType<'GET /api/apm/correlations/errors/failed_transactions'>
  | APIReturnType<'GET /api/apm/correlations/latency/slow_transactions'>;

export type SignificantTerm = CorrelationsApiResponse['significantTerms'][0];

export type SelectedSignificantTerm = Pick<
  SignificantTerm,
  'fieldName' | 'fieldValue'
>;

interface Props<T> {
  significantTerms?: T[];
  status: FETCH_STATUS;
  percentageColumnName?: string;
  setSelectedSignificantTerm: (term: SelectedSignificantTerm | null) => void;
  onFilter: () => void;
  columns?: Array<EuiBasicTableColumn<T>>;
}

export function CorrelationsTable<T extends SignificantTerm>({
  significantTerms,
  status,
  percentageColumnName,
  setSelectedSignificantTerm,
  onFilter,
  columns,
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
  const tableColumns: Array<EuiBasicTableColumn<T>> = columns ?? [
    {
      width: '116px',
      field: 'impact',
      name: i18n.translate(
        'xpack.apm.correlations.correlationsTable.impactLabel',
        { defaultMessage: 'Impact' }
      ),
      render: (_: any, term: T) => {
        return <ImpactBar size="m" value={term.impact * 100} />;
      },
    },
    {
      field: 'percentage',
      name:
        percentageColumnName ??
        i18n.translate(
          'xpack.apm.correlations.correlationsTable.percentageLabel',
          { defaultMessage: 'Percentage' }
        ),
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
          name: FILTER_LABEL,
          description: FILTER_DESCRIPTION,
          icon: 'plusInCircle',
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
          name: EXCLUDE_ACTION_LABEL,
          description: EXCLUDE_ACTION_DESCRIPTION,
          icon: 'minusInCircle',
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
      name: FILTER_ACTION_LABEL,
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
      columns={tableColumns}
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
