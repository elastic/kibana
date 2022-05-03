/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiEmptyPrompt, EuiBasicTable } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { extractErrorMessage } from '../../../../../common/utils/helpers';
import * as TEST_SUBJECTS from '../../test_subjects';
import * as TEXT from '../../translations';
import type { ResourceFindingsResult } from './use_resource_findings';
import { getFindingsColumns } from '../../layout/findings_layout';

export const formatNumber = (value: number) =>
  value < 1000 ? value : numeral(value).format('0.0a');

type FindingsGroupByResourceProps = ResourceFindingsResult;
type CspFindingsByResource = NonNullable<ResourceFindingsResult['data']>[number];

export const getResourceId = (resource: CspFindingsByResource) =>
  [resource.resource_id, resource.cluster_id, resource.cis_section].join('/');

const columns = getFindingsColumns();

const ResourceFindingsTableComponent = ({ error, data, loading }: FindingsGroupByResourceProps) => {
  const getRowProps = (row: CspFindingsByResource) => ({
    'data-test-subj': TEST_SUBJECTS.getFindingsByResourceTableRowTestId(getResourceId(row)),
  });

  if (!loading && !data?.page.length)
    return <EuiEmptyPrompt iconType="logoKibana" title={<h2>{TEXT.NO_FINDINGS}</h2>} />;

  return (
    <EuiBasicTable
      loading={loading}
      error={error ? extractErrorMessage(error) : undefined}
      items={data?.page || []}
      columns={columns}
      rowProps={getRowProps}
    />
  );
};

export const ResourceFindingsTable = React.memo(ResourceFindingsTableComponent);
