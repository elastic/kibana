/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import { css } from '@emotion/react';
import React, { useCallback, useState } from 'react';
import type { Pagination } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';

import * as i18n from './translations';
import { MAX_DOCS_PER_PAGE } from '../../../common/constants';

export const MaxCasesWarning: FunctionComponent<{ totalCases: number; pagination: Pagination }> =
  React.memo(({ totalCases, pagination }) => {
    const [isMessageDismissed, setIsMessageDismissed] = useState(false);

    const toggleWarning = useCallback(
      () => setIsMessageDismissed(!isMessageDismissed),
      [isMessageDismissed]
    );

    const hasReachedMaxCases =
      pagination.pageSize &&
      totalCases >= MAX_DOCS_PER_PAGE &&
      pagination.pageSize * (pagination.pageIndex + 1) >= MAX_DOCS_PER_PAGE;

    const renderMaxLimitWarning = (): React.ReactNode => (
      <EuiFlexGroup gutterSize="m" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiText
            color="default"
            size="m"
            css={css`
              margin-top: 4px;
            `}
          >
            {i18n.MAX_CASES(MAX_DOCS_PER_PAGE)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color="warning"
            data-test-subj="dismiss-warning"
            onClick={toggleWarning}
          >
            {i18n.DISMISS}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return hasReachedMaxCases && !isMessageDismissed ? (
      <>
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiCallOut
              title={renderMaxLimitWarning()}
              color="primary"
              size="s"
              data-test-subj="all-cases-maximum-limit-warning"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
      </>
    ) : null;
  });

MaxCasesWarning.displayName = 'MaxCasesWarning';
