/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import styled, { css } from 'styled-components';
import {
  EuiButtonEmpty,
  EuiTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiAvatar,
  EuiAccordion,
  EuiCommentList,
  EuiCommentProps,
} from '@elastic/eui';
import { Comment } from '../../../lists_plugin_deps';
import * as i18n from './translations';
import { useCurrentUser } from '../../lib/kibana';
import { getFormattedComments } from './helpers';

interface AddExceptionCommentsProps {
  exceptionItemComments?: Comment[];
  newCommentValue: string;
  newCommentOnChange: (value: string) => void;
}

const MyAvatar = styled(EuiAvatar)`
  ${({ theme }) => css`
    margin-right: ${theme.eui.euiSizeM};
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

  const handleTriggerOnClick = useCallback(() => {
    setShouldShowComments(!shouldShowComments);
  }, [shouldShowComments]);

  const shouldShowAccordion: boolean = useMemo(() => {
    return (
      exceptionItemComments !== undefined &&
      exceptionItemComments !== null &&
      exceptionItemComments.length > 0
    );
  }, [exceptionItemComments]);

  // TODO: use onToggle on the accordion instead of rendering another button
  const commentsAccordionTrigger = useMemo((): JSX.Element | null => {
    if (exceptionItemComments && exceptionItemComments.length > 0) {
      return (
        <EuiButtonEmpty
          onClick={handleTriggerOnClick}
          flush="left"
          size="xs"
          data-test-subj="addExceptionCommentsAccordionButton"
        >
          {!shouldShowComments
            ? i18n.COMMENTS_SHOW(exceptionItemComments.length)
            : i18n.COMMENTS_HIDE(exceptionItemComments.length)}
        </EuiButtonEmpty>
      );
    } else {
      return null;
    }
  }, [shouldShowComments, exceptionItemComments, handleTriggerOnClick]);

  const formattedComments = useMemo((): EuiCommentProps[] => {
    if (exceptionItemComments && exceptionItemComments.length > 0) {
      return getFormattedComments(exceptionItemComments);
    } else {
      return [];
    }
  }, [exceptionItemComments]);

  // TODO: Add user full name to element title property
  // TODO: Avatar should use the same logic as the one in EuiCommentList
  // TODO: Figure out why dates are incorrect for new comments
  // TODO: Placeholder intl
  return (
    <div>
      {shouldShowAccordion && (
        <EuiAccordion
          id={'add-exception-comments-accordion'}
          buttonContent={commentsAccordionTrigger}
          forceState={shouldShowComments ? 'open' : 'closed'}
          data-test-subj="addExceptionCommentsAccordion"
        >
          <EuiCommentList comments={formattedComments} />
        </EuiAccordion>
      )}
      <EuiFlexGroup gutterSize={'none'}>
        <EuiFlexItem grow={false}>
          <MyAvatar name={currentUser != null ? currentUser.fullName ?? '' : ''} size="l" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTextArea
            placeholder="Add a new comment..."
            aria-label="Use aria labels when no actual label is in use"
            value={newCommentValue}
            onChange={handleOnChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
});
