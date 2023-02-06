/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import styled, { css } from 'styled-components';
import type { EuiCommentProps } from '@elastic/eui';
import {
  EuiTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiAvatar,
  EuiAccordion,
  EuiCommentList,
  EuiText,
} from '@elastic/eui';
import type { Comment } from '@kbn/securitysolution-io-ts-list-types';
import * as i18n from './translations';
import { useCurrentUser } from '../../../../common/lib/kibana';
import { getFormattedComments } from '../../utils/helpers';

interface ExceptionItemCommentsProps {
  exceptionItemComments?: Comment[];
  newCommentValue: string;
  accordionTitle?: JSX.Element;
  newCommentOnChange: (value: string) => void;
}

const COMMENT_ACCORDION_BUTTON_CLASS_NAME = 'exceptionCommentAccordionButton';

const MyAvatar = styled(EuiAvatar)`
  ${({ theme }) => css`
    margin-right: ${theme.eui.euiSizeS};
  `}
`;

const CommentAccordion = styled(EuiAccordion)`
  ${({ theme }) => css`
    .${COMMENT_ACCORDION_BUTTON_CLASS_NAME} {
      color: ${theme.eui.euiColorPrimary};
      padding: ${theme.eui.euiSizeM} 0;
    }
  `}
`;

export const ExceptionItemComments = memo(function ExceptionItemComments({
  exceptionItemComments,
  newCommentValue,
  accordionTitle,
  newCommentOnChange,
}: ExceptionItemCommentsProps) {
  const [shouldShowComments, setShouldShowComments] = useState(false);
  const currentUser = useCurrentUser();
  const fullName = currentUser?.fullName;
  const userName = currentUser?.username;
  const userEmail = currentUser?.email;
  const avatarName = useMemo(() => {
    if (fullName && fullName.length > 0) {
      return fullName;
    }

    // Did email second because for cloud users, username is a uuid,
    // so favor using name or email prior to using the cloud generated id
    if (userEmail && userEmail.length > 0) {
      return userEmail;
    }

    return userName && userName.length > 0 ? userName : i18n.UNKNOWN_AVATAR_NAME;
  }, [fullName, userEmail, userName]);

  const handleOnChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      newCommentOnChange(event.target.value);
    },
    [newCommentOnChange]
  );

  const handleTriggerOnClick = useCallback((isOpen: boolean) => {
    setShouldShowComments(isOpen);
  }, []);

  const commentsAccordionTitle = useMemo(() => {
    if (exceptionItemComments && exceptionItemComments.length > 0) {
      return (
        <EuiText size="s" data-test-subj="ExceptionItemCommentsAccordionButton">
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
      <CommentAccordion
        id={'add-exception-comments-accordion'}
        buttonClassName={COMMENT_ACCORDION_BUTTON_CLASS_NAME}
        buttonContent={accordionTitle ?? commentsAccordionTitle}
        data-test-subj="exceptionItemCommentsAccordion"
        onToggle={(isOpen) => handleTriggerOnClick(isOpen)}
      >
        <EuiCommentList comments={formattedComments} />
        <EuiFlexGroup gutterSize={'none'}>
          <EuiFlexItem grow={false}>
            <MyAvatar name={avatarName} size="l" data-test-subj="exceptionItemCommentAvatar" />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiTextArea
              placeholder={i18n.ADD_COMMENT_PLACEHOLDER}
              aria-label="Comment Input"
              value={newCommentValue}
              onChange={handleOnChange}
              fullWidth={true}
              data-test-subj="newExceptionItemCommentTextArea"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </CommentAccordion>
    </div>
  );
});
