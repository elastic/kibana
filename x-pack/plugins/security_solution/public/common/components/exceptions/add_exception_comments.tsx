/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import styled, { css } from 'styled-components';
import {
  EuiTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiAvatar,
  EuiAccordion,
  EuiCommentList,
  EuiCommentProps,
  EuiText,
} from '@elastic/eui';
import { Comments } from '../../../lists_plugin_deps';
import * as i18n from './translations';
import { useCurrentUser } from '../../lib/kibana';
import { getFormattedComments } from './helpers';

interface AddExceptionCommentsProps {
  exceptionItemComments?: Comments[];
  newCommentValue: string;
  newCommentOnChange: (value: string) => void;
}

const COMMENT_ACCORDION_BUTTON_CLASS_NAME = 'exceptionCommentAccordionButton';

const MyAvatar = styled(EuiAvatar)`
  ${({ theme }) => css`
    margin-right: ${theme.eui.paddingSizes.m};
  `}
`;

const CommentAccordion = styled(EuiAccordion)`
  ${({ theme }) => css`
    .${COMMENT_ACCORDION_BUTTON_CLASS_NAME} {
      color: ${theme.eui.euiColorPrimary};
      padding: ${theme.eui.paddingSizes.m} 0;
    }
  `}
`;

export const AddExceptionComments = memo(function AddExceptionComments({
  exceptionItemComments,
  newCommentValue,
  newCommentOnChange,
}: AddExceptionCommentsProps) {
  const [shouldShowComments, setShouldShowComments] = useState(false);
  const currentUser = useCurrentUser();

  const handleOnChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      newCommentOnChange(event.target.value);
    },
    [newCommentOnChange]
  );

  const handleTriggerOnClick = useCallback((isOpen: boolean) => {
    setShouldShowComments(isOpen);
  }, []);

  const shouldShowAccordion: boolean = useMemo(() => {
    return exceptionItemComments != null && exceptionItemComments.length > 0;
  }, [exceptionItemComments]);

  const commentsAccordionTitle = useMemo(() => {
    if (exceptionItemComments && exceptionItemComments.length > 0) {
      return (
        <EuiText size="s" data-test-subj="addExceptionCommentsAccordionButton">
          {!shouldShowComments
            ? i18n.COMMENTS_SHOW(exceptionItemComments.length)
            : i18n.COMMENTS_HIDE(exceptionItemComments.length)}
        </EuiText>
      );
    } else {
      return null;
    }
  }, [shouldShowComments, exceptionItemComments]);

  const formattedComments = useMemo((): EuiCommentProps[] => {
    if (exceptionItemComments && exceptionItemComments.length > 0) {
      return getFormattedComments(exceptionItemComments);
    } else {
      return [];
    }
  }, [exceptionItemComments]);

  return (
    <div>
      {shouldShowAccordion && (
        <CommentAccordion
          id={'add-exception-comments-accordion'}
          buttonClassName={COMMENT_ACCORDION_BUTTON_CLASS_NAME}
          buttonContent={commentsAccordionTitle}
          data-test-subj="addExceptionCommentsAccordion"
          onToggle={(isOpen) => handleTriggerOnClick(isOpen)}
        >
          <EuiCommentList comments={formattedComments} />
        </CommentAccordion>
      )}
      <EuiFlexGroup gutterSize={'none'}>
        <EuiFlexItem grow={false}>
          <MyAvatar
            name={currentUser !== null ? currentUser.username.toUpperCase() ?? '' : ''}
            size="l"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiTextArea
            placeholder={i18n.ADD_COMMENT_PLACEHOLDER}
            aria-label="Use aria labels when no actual label is in use"
            value={newCommentValue}
            onChange={handleOnChange}
            fullWidth={true}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
});
