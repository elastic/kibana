/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiLoadingChart } from '@elastic/eui';
import styled from 'styled-components';
import { TEST_IDS } from './constants';

const FilterGroupLoadingButton = styled(EuiButton)`
  height: 34px;
`;

export const FilterGroupLoading = () => {
  return (
    <FilterGroupLoadingButton color="text">
      <EuiLoadingChart className="filter-group__loading" data-test-subj={TEST_IDS.FILTER_LOADING} />
    </FilterGroupLoadingButton>
  );
};
