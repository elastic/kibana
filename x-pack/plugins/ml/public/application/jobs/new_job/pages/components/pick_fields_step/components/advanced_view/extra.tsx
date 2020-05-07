/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { SummaryCountField } from '../summary_count_field';
import { CategorizationField } from '../categorization_field';

export const ExtraSettings: FC = () => {
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
    </Fragment>
  );
};
