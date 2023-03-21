/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { FILTER_GROUP_BANNER_MESSAGE, FILTER_GROUP_BANNER_TITLE } from './translations';

export const FiltersChangedBanner = () => {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s">
      <EuiFlexItem grow={true}>
        <EuiCallOut
          data-test-subj="filter-group--changed-banner"
          title={FILTER_GROUP_BANNER_TITLE}
          iconType={'iInCircle'}
        >
          <p>{FILTER_GROUP_BANNER_MESSAGE}</p>
        </EuiCallOut>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
