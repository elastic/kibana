/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback, useState } from 'react';
import { CommonProps, EuiAccordion, EuiCommentList, EuiCommentProps } from '@elastic/eui';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { CardActionsFlexItemProps } from './card_actions_flex_item';
import { AnyArtifact } from '../types';
import { getFormattedComments } from '../utils/get_formatted_comments';

export interface CardCommentsProps
  extends CardActionsFlexItemProps,
    Pick<CommonProps, 'data-test-subj'> {
  comments: AnyArtifact['comments'];
}

export const CardComments = memo<CardCommentsProps>(
  ({ comments, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const [showComments, setShowComments] = useState(true);
    const onCommentsClick = useCallback((): void => {
      setShowComments(!showComments);
    }, [setShowComments, showComments]);
    const formattedComments = useMemo((): EuiCommentProps[] => {
      return getFormattedComments(comments);
    }, [comments]);

    return (
      <EuiAccordion
        id={'1'}
        arrowDisplay="none"
        forceState={showComments ? 'open' : 'closed'}
        data-test-subj="exceptionsViewerCommentAccordion"
      >
        <EuiCommentList comments={formattedComments} />
      </EuiAccordion>
    );
  }
);

CardComments.displayName = 'CardComments';
