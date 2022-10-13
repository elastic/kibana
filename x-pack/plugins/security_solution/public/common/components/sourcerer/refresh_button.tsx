/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from 'styled-components';

import { RELOAD_PAGE_TITLE } from './translations';

const StyledRefreshButton = styled(EuiButton)`
  float: right;
`;

export const RefreshButton = React.memo(() => {
  const onPageRefresh = useCallback(() => {
    document.location.reload();
  }, []);
  return (
    <StyledRefreshButton onClick={onPageRefresh} data-test-subj="page-refresh">
      {RELOAD_PAGE_TITLE}
    </StyledRefreshButton>
  );
});

RefreshButton.displayName = 'RefreshButton';
