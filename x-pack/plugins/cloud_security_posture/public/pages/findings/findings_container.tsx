/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo } from 'react';
import { EuiComboBoxOptionOption, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-plugin/common';
import { SortDirection } from '@kbn/data-plugin/common';
import { buildEsQuery } from '@kbn/es-query';
import { FindingsTable } from './findings_table';
import { FindingsSearchBar } from './findings_search_bar';
import * as TEST_SUBJECTS from './test_subjects';
import { useUrlQuery } from '../../common/hooks/use_url_query';
import { useFindings, type CspFindingsRequest } from './use_findings';
import { FindingsGroupBySelector } from './findings_group_by_selector';
import { INTERNAL_FEATURE_FLAGS } from '../../../common/constants';
import { useFindingsCounter } from './use_findings_count';
import { FindingsDistributionBar } from './findings_distribution_bar';
import type { CspClientPluginStartDeps } from '../../types';
import { useKibana } from '../../common/hooks/use_kibana';
import * as TEXT from './translations';

export type GroupBy = 'none' | 'resourceType';
export type FindingsBaseQuery = ReturnType<typeof getFindingsBaseEsQuery>;

// TODO: define this as a schema with default values
export const getDefaultQuery = (): CspFindingsRequest & { groupBy: GroupBy } => ({
  query: { language: 'kuery', query: '' },
  filters: [],
  sort: [{ ['@timestamp']: SortDirection.desc }],
  from: 0,
  size: 10,
  groupBy: 'none',
});

const getGroupByOptions = (): Array<EuiComboBoxOptionOption<GroupBy>> => [
  {
    value: 'none',
    label: i18n.translate('xpack.csp.findings.groupBySelector.groupByNoneLabel', {
      defaultMessage: 'None',
    }),
  },
  {
    value: 'resourceType',
    label: i18n.translate('xpack.csp.findings.groupBySelector.groupByResourceTypeLabel', {
      defaultMessage: 'Resource Type',
    }),
  },
];

const getFindingsBaseEsQuery = ({
  query,
  dataView,
  filters,
  queryService,
}: Pick<CspFindingsRequest, 'filters' | 'query'> & {
  dataView: DataView;
  queryService: CspClientPluginStartDeps['data']['query'];
}) => {
  if (query) queryService.queryString.setQuery(query);
  queryService.filterManager.setFilters(filters);

  try {
    return {
      index: dataView.title,
      query: buildEsQuery(
        dataView,
        queryService.queryString.getQuery(),
        queryService.filterManager.getFilters()
      ),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error
          : new Error(
              i18n.translate('xpack.csp.findings.unknownError', {
                defaultMessage: 'Unknown Error',
              })
            ),
    };
  }
};

export const FindingsContainer = ({ dataView }: { dataView: DataView }) => {
  const { euiTheme } = useEuiTheme();
  const groupByOptions = useMemo(getGroupByOptions, []);
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  const {
    urlQuery: { groupBy, ...findingsQuery },
    setUrlQuery,
  } = useUrlQuery(getDefaultQuery);

  const baseQuery = useMemo(
    () => getFindingsBaseEsQuery({ ...findingsQuery, dataView, queryService: data.query }),
    [data.query, dataView, findingsQuery]
  );

  const countResult = useFindingsCounter(baseQuery);
  const findingsResult = useFindings({
    ...baseQuery,
    size: findingsQuery.size,
    from: findingsQuery.from,
    sort: findingsQuery.sort,
  });

  useEffect(() => {
    if (baseQuery.error) {
      toasts.addError(baseQuery.error, { title: TEXT.SEARCH_FAILED });
    }
  }, [baseQuery.error, toasts]);

  return (
    <div data-test-subj={TEST_SUBJECTS.FINDINGS_CONTAINER}>
      <FindingsSearchBar
        dataView={dataView}
        setQuery={setUrlQuery}
        query={findingsQuery.query}
        filters={findingsQuery.filters}
        loading={findingsResult.isLoading}
      />
      <div
        css={css`
          padding: ${euiTheme.size.l};
        `}
      >
        <PageTitle />
        <EuiSpacer />
        {INTERNAL_FEATURE_FLAGS.showFindingsGroupBy && (
          <FindingsGroupBySelector
            type={groupBy}
            onChange={(type) => setUrlQuery({ groupBy: type[0]?.value })}
            options={groupByOptions}
          />
        )}
        <EuiSpacer />
        {groupBy === 'none' && (
          <>
            <FindingsDistributionBar
              total={findingsResult.data?.total || 0}
              passed={countResult.data?.passed || 0}
              failed={countResult.data?.failed || 0}
              pageStart={findingsQuery.from + 1} // API index is 0, but UI is 1
              pageEnd={findingsQuery.from + findingsQuery.size}
            />
            <EuiSpacer />
            <FindingsTable
              {...findingsQuery}
              setQuery={setUrlQuery}
              data={findingsResult.data}
              error={findingsResult.error}
              loading={findingsResult.isLoading}
            />
          </>
        )}
        {groupBy === 'resourceType' && <div />}
      </div>
    </div>
  );
};

const PageTitle = () => (
  <EuiTitle size="l">
    <h2>
      <FormattedMessage id="xpack.csp.findings.findingsTitle" defaultMessage="Findings" />
    </h2>
  </EuiTitle>
);
