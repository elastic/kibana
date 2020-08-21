/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { SummaryCountField } from '../summary_count_field';
import { CategorizationField } from '../categorization_field';
import { CategorizationPerPartitionField } from '../categorization_partition_field';
import { JobCreatorContext } from '../../../job_creator_context';
import { isAdvancedJobCreator } from '../../../../../common/job_creator';

export const ExtraSettings: FC = () => {
  const { jobCreator } = useContext(JobCreatorContext);
  const showCategorizationPerPartitionField =
    isAdvancedJobCreator(jobCreator) && jobCreator.categorizationFieldName !== null;
  return (
    <Fragment>
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem>
          <CategorizationField />
        </EuiFlexItem>
        <EuiFlexItem>
          <SummaryCountField />
        </EuiFlexItem>
      </EuiFlexGroup>
      {showCategorizationPerPartitionField && <CategorizationPerPartitionField />}
    </Fragment>
  );
};
