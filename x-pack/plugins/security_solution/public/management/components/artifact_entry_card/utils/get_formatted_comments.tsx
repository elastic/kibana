/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiText, EuiCommentProps } from '@elastic/eui';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import moment from 'moment';
import { CommentsArray } from '@kbn/securitysolution-io-ts-list-types';
import { COMMENT_EVENT } from '../../../../common/components/exceptions/translations';

/**
 * Formats ExceptionItem.comments into EuiCommentList format
 *
 * @param comments ExceptionItem.comments
 */
export const getFormattedComments = (comments: CommentsArray): EuiCommentProps[] => {
  return comments.map((commentItem) => ({
    username: commentItem.created_by,
    timestamp: moment(commentItem.created_at).format('MMM D, YYYY'),
    event: COMMENT_EVENT,
    timelineIcon: (
      <EuiAvatar
        size="s"
        color={euiLightVars.euiColorLightestShade}
        name={commentItem.created_by}
      />
    ),
    children: <EuiText size="s">{commentItem.comment}</EuiText>,
  }));
};
