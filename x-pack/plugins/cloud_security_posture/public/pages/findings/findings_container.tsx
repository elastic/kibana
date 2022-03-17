/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FindingsTable } from './findings_table';
import { FindingsSearchBar } from './findings_search_bar';
import * as TEST_SUBJECTS from './test_subjects';
import type { DataView } from '../../../../../../src/plugins/data/common';
import { SortDirection } from '../../../../../../src/plugins/data/common';
import { useUrlQuery } from '../../common/hooks/use_url_query';
import { useFindings, type CspFindingsRequest } from './use_findings';

// TODO: define this as a schema with default values
// need to get Query and DateRange schema
const getDefaultQuery = (): CspFindingsRequest => ({
  query: { language: 'kuery', query: '' },
  filters: [],
  dateRange: {
    from: 'now-15m',
    to: 'now',
  },
  sort: [{ ['@timestamp']: SortDirection.desc }],
  from: 0,
  size: 10,
});

export const FindingsContainer = ({ dataView }: { dataView: DataView }) => {
  const { urlQuery: findingsQuery, setUrlQuery, key } = useUrlQuery(getDefaultQuery);
  const findingsResult = useFindings(dataView, findingsQuery, key);

  return (
    <div data-test-subj={TEST_SUBJECTS.FINDINGS_CONTAINER}>
      <FindingsSearchBar
        dataView={dataView}
        setQuery={setUrlQuery}
        {...findingsQuery}
        {...findingsResult}
      />
      <EuiSpacer />
      <FindingsTable setQuery={setUrlQuery} {...findingsQuery} {...findingsResult} />
    </div>
  );
};
