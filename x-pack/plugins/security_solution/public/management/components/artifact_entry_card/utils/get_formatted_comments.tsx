/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiText, EuiCommentProps } from '@elastic/eui';
import styled from 'styled-components';
import { CommentsArray } from '@kbn/securitysolution-io-ts-list-types';
import { COMMENT_EVENT } from '../../../../common/components/exceptions/translations';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';

const CustomEuiAvatar = styled(EuiAvatar)`
  background-color: ${({ theme }) => theme.eui.euiColorLightShade} !important;
`;

/**
 * Formats ExceptionItem.comments into EuiCommentList format
 *
 * @param comments ExceptionItem.comments
 */
export const getFormattedComments = (comments: CommentsArray): EuiCommentProps[] => {
  return comments.map((commentItem) => ({
    username: commentItem.created_by,
    timestamp: (
      <FormattedRelativePreferenceDate value={commentItem.created_at} dateFormat="MMM D, YYYY" />
    ),
    event: COMMENT_EVENT,
    timelineIcon: <CustomEuiAvatar size="s" name={commentItem.created_by} />,
    children: <EuiText size="s">{commentItem.comment}</EuiText>,
  }));
};
