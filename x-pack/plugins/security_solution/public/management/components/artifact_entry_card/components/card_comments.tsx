/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback, useState } from 'react';
import {
  CommonProps,
  EuiAccordion,
  EuiCommentList,
  EuiCommentProps,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { CardActionsFlexItemProps } from './card_actions_flex_item';
import { ArtifactInfo } from '../types';
import { getFormattedComments } from '../utils/get_formatted_comments';
import { SHOW_COMMENTS_LABEL, HIDE_COMMENTS_LABEL } from './translations';

export interface CardCommentsProps
  extends CardActionsFlexItemProps,
    Pick<CommonProps, 'data-test-subj'> {
  comments: ArtifactInfo['comments'];
}

export const CardComments = memo<CardCommentsProps>(
  ({ comments, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const [showComments, setShowComments] = useState(false);
    const onCommentsClick = useCallback((): void => {
      setShowComments(!showComments);
    }, [setShowComments, showComments]);
    const formattedComments = useMemo((): EuiCommentProps[] => {
      return getFormattedComments(comments);
    }, [comments]);

    const buttonText = useMemo(
      () =>
        showComments ? HIDE_COMMENTS_LABEL(comments.length) : SHOW_COMMENTS_LABEL(comments.length),
      [comments.length, showComments]
    );

    return !isEmpty(comments) ? (
      <div data-test-subj={dataTestSubj}>
        <EuiSpacer size="s" />
        <EuiButtonEmpty
          onClick={onCommentsClick}
          flush="left"
          size="xs"
          data-test-subj={getTestId('label')}
        >
          {buttonText}
        </EuiButtonEmpty>
        <EuiAccordion id={'1'} arrowDisplay="none" forceState={showComments ? 'open' : 'closed'}>
          <EuiSpacer size="m" />
          <EuiCommentList comments={formattedComments} data-test-subj={getTestId('list')} />
        </EuiAccordion>
      </div>
    ) : null;
  }
);

CardComments.displayName = 'CardComments';
