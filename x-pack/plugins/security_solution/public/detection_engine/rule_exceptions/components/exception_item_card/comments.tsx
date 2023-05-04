/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { EuiCommentProps } from '@elastic/eui';
import {
  EuiAccordion,
  EuiCommentList,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

import * as i18n from './translations';

export interface ExceptionItemCardCommentsProps {
  comments: EuiCommentProps[];
}

export const ExceptionItemCardComments = memo<ExceptionItemCardCommentsProps>(({ comments }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem>
      <EuiAccordion
        id="exceptionItemCardComments"
        buttonContent={
          <EuiText size="s" style={{ color: euiTheme.colors.primary }}>
            {i18n.exceptionItemCommentsAccordion(comments.length)}
          </EuiText>
        }
        arrowDisplay="none"
        data-test-subj="exceptionsViewerCommentAccordion"
      >
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
          <EuiCommentList comments={comments} />
        </EuiPanel>
      </EuiAccordion>
    </EuiFlexItem>
  );
});

ExceptionItemCardComments.displayName = 'ExceptionItemCardComments';
