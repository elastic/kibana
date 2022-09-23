/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiSpacer, EuiTitle } from '@elastic/eui';
import styled, { css } from 'styled-components';
import type { Comment } from '@kbn/securitysolution-io-ts-list-types';

import * as i18n from './translations';
import { ExceptionItemComments } from '../../item_comments';

const SectionHeader = styled(EuiTitle)`
  ${() => css`
    font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  `}
`;

interface ExceptionsFlyoutCommentsProps {
  existingComments?: Comment[];
  newComment: string;
  onCommentChange: (comment: string) => void;
}

const ExceptionsFlyoutCommentsComponent: React.FC<ExceptionsFlyoutCommentsProps> = ({
  existingComments,
  newComment,
  onCommentChange,
}): JSX.Element => {
  return (
    <EuiAccordion
      id="exceptionFlyoutCommentAccordion"
      buttonContent={
        <SectionHeader size="xs">
          <h3>
            {i18n.COMMENTS_SECTION_TITLE(existingComments != null ? existingComments.length : 0)}
          </h3>
        </SectionHeader>
      }
      data-test-subj="exceptionFlyoutCommentAccordion"
    >
      <>
        <EuiSpacer size="s" />
        {existingComments != null ? (
          <ExceptionItemComments
            expandComments
            exceptionItemComments={existingComments}
            newCommentValue={newComment}
            newCommentOnChange={onCommentChange}
          />
        ) : (
          <ExceptionItemComments
            newCommentValue={newComment}
            newCommentOnChange={onCommentChange}
          />
        )}
      </>
    </EuiAccordion>
  );
};

export const ExceptionsFlyoutComments = React.memo(ExceptionsFlyoutCommentsComponent);

ExceptionsFlyoutComments.displayName = 'ExceptionsFlyoutComments';
