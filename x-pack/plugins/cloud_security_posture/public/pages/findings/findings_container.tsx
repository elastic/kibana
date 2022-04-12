/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiComboBoxOptionOption, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { FindingsTable } from './findings_table';
import { FindingsSearchBar } from './findings_search_bar';
import * as TEST_SUBJECTS from './test_subjects';
import type { DataView } from '../../../../../../src/plugins/data/common';
import { SortDirection } from '../../../../../../src/plugins/data/common';
import { useUrlQuery } from '../../common/hooks/use_url_query';
import { useFindings, type CspFindingsRequest } from './use_findings';
import { FindingsGroupBySelector } from './findings_group_by_selector';
import { INTERNAL_FEATURE_FLAGS } from '../../../common/constants';

export type GroupBy = 'none' | 'resourceType';

// TODO: define this as a schema with default values
const getDefaultQuery = (): CspFindingsRequest & { groupBy: GroupBy } => ({
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

export const FindingsContainer = ({ dataView }: { dataView: DataView }) => {
  const {
    urlQuery: { groupBy, ...findingsQuery },
    setUrlQuery,
    key,
  } = useUrlQuery(getDefaultQuery);
  const findingsResult = useFindings(dataView, findingsQuery, key);
  const { euiTheme } = useEuiTheme();
  const groupByOptions = useMemo(getGroupByOptions, []);

  return (
    <div data-test-subj={TEST_SUBJECTS.FINDINGS_CONTAINER}>
      <FindingsSearchBar
        dataView={dataView}
        setQuery={setUrlQuery}
        {...findingsQuery}
        {...findingsResult}
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
            onChange={(type) => setUrlQuery({ groupBy: type[0].value })}
            options={groupByOptions}
          />
        )}
        <EuiSpacer />
        {groupBy === 'none' && (
          <FindingsTable setQuery={setUrlQuery} {...findingsQuery} {...findingsResult} />
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
