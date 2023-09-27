/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataTableRecord } from '@kbn/discover-utils/types';
import type { Evaluation } from '../../../../common/types';
import type { FindingsBaseProps } from '../../../common/types';
import { FindingsSearchBar } from '../layout/findings_search_bar';
import * as TEST_SUBJECTS from '../test_subjects';
import { useLatestFindings } from './use_latest_findings';
import { FindingsDistributionBar } from '../layout/findings_distribution_bar';
import { getFilters } from '../utils/utils';
import { ErrorCallout } from '../layout/error_callout';
import { LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY } from '../../../common/constants';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { useCloudPostureTable } from '../../../common/hooks/use_cloud_posture_table';
import {
  CloudSecurityDataTable,
  CloudSecurityDefaultColumn,
} from '../../../components/cloud_security_data_table';
import { FindingsRuleFlyout } from '../findings_flyout/findings_flyout';

const getDefaultQuery = ({ query, filters }: any): any => ({
  query,
  filters,
  sort: [['@timestamp', 'desc']],
  pageIndex: 0,
});

const defaultColumns: CloudSecurityDefaultColumn[] = [
  { id: 'result.evaluation' },
  { id: 'resource.id' },
  { id: 'resource.name' },
  { id: 'resource.sub_type' },
  { id: 'rule.benchmark.rule_number' },
  { id: 'rule.name' },
  { id: 'rule.section' },
  { id: '@timestamp' },
];

export const LatestFindingsContainer = ({ dataView }: FindingsBaseProps) => {
  const cloudPostureTable = useCloudPostureTable({
    dataView,
    paginationLocalStorageKey: LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY,
    defaultQuery: getDefaultQuery,
  });

  const { query, sort, queryError, setUrlQuery, filters } = cloudPostureTable;

  const findingsGroupByNone = useLatestFindings({
    query,
    sort,
    enabled: !queryError,
  });

  const rows = useMemo(() => {
    return (
      findingsGroupByNone.data?.pages
        ?.map(({ page }) => {
          return page;
        })
        .flat() || []
    );
  }, [findingsGroupByNone.data?.pages]);

  const error = findingsGroupByNone.error || queryError;

  const handleDistributionClick = (evaluation: Evaluation) => {
    setUrlQuery({
      pageIndex: 0,
      filters: getFilters({
        filters,
        dataView,
        field: 'result.evaluation',
        value: evaluation,
        negate: false,
      }),
    });
  };

  const isCspFinding = (source: any): source is CspFinding => {
    return source?.result?.evaluation !== undefined;
  };

  const flyoutComponent = (hit: DataTableRecord, onCloseFlyout: () => void): JSX.Element => {
    const finding = isCspFinding(hit.raw._source) && (hit.raw._source as CspFinding);
    if (!finding) return <></>;
    return <FindingsRuleFlyout findings={finding} onClose={onCloseFlyout} />;
  };

  return (
    <div data-test-subj={TEST_SUBJECTS.LATEST_FINDINGS_CONTAINER}>
      <FindingsSearchBar
        dataView={dataView}
        setQuery={(newQuery) => {
          setUrlQuery({ ...newQuery, pageIndex: 0 });
        }}
        loading={findingsGroupByNone.isFetching}
      />
      <EuiSpacer size="m" />
      {error && <ErrorCallout error={error} />}
      {!error && (
        <>
          {findingsGroupByNone.isSuccess && !!findingsGroupByNone.data.pages[0].page.length && (
            <FindingsDistributionBar
              distributionOnClick={handleDistributionClick}
              type={i18n.translate('xpack.csp.findings.latestFindings.tableRowTypeLabel', {
                defaultMessage: 'Findings',
              })}
              passed={findingsGroupByNone.data.pages[0].count.passed}
              failed={findingsGroupByNone.data.pages[0].count.failed}
            />
          )}
          <EuiSpacer />
          <CloudSecurityDataTable
            dataView={dataView}
            isLoading={findingsGroupByNone.isFetching}
            defaultColumns={defaultColumns}
            sort={sort}
            rows={rows}
            total={findingsGroupByNone.data?.pages[0].total || 0}
            flyoutComponent={flyoutComponent}
            cloudPostureTable={cloudPostureTable}
            loadMore={() => findingsGroupByNone.fetchNextPage()}
          />
        </>
      )}
    </div>
  );
};
