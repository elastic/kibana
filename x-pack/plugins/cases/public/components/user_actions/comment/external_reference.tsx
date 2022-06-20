/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';

import { EuiLoadingSpinner } from '@elastic/eui';
import { CommentResponseExternalReferenceType } from '../../../../common/api';
import { UserActionBuilder, UserActionBuilderArgs } from '../types';
import { UserActionTimestamp } from '../timestamp';
import { SnakeToCamelCase } from '../../../../common/types';
import { UserActionUsernameWithAvatar } from '../avatar_username';
import { UserActionCopyLink } from '../copy_link';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  'userAction' | 'externalReferenceAttachmentTypeRegistry' | 'caseData'
> & {
  comment: SnakeToCamelCase<CommentResponseExternalReferenceType>;
};

export const createExternalReferenceAttachmentUserActionBuilder = ({
  userAction,
  comment,
  externalReferenceAttachmentTypeRegistry,
  caseData,
}: BuilderArgs): ReturnType<UserActionBuilder> => ({
  // TODO: Fix this manually. Issue #123375
  // eslint-disable-next-line react/display-name
  build: () => {
    const externalReferenceType = externalReferenceAttachmentTypeRegistry.get(
      comment.externalReferenceAttachmentTypeId
    );

    if (!externalReferenceType) {
      return [];
    }

    const externalReferenceViewObject = externalReferenceType.getAttachmentViewObject({
      externalReferenceId: externalReferenceType.id,
      externalReferenceMetadata: comment.externalReferenceMetadata,
      caseData: { id: caseData.id, title: caseData.title },
    });

    return [
      {
        username: (
          <UserActionUsernameWithAvatar
            username={comment.createdBy.username}
            fullName={comment.createdBy.fullName}
          />
        ),
        type: externalReferenceViewObject.type,
        className: `comment-external-reference${externalReferenceType.id}`,
        event: externalReferenceViewObject.event,
        'data-test-subj': `comment-external-reference${externalReferenceType.id}`,
        timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
        timelineIcon: externalReferenceViewObject.timelineIcon,
        actions: (
          <>
            <UserActionCopyLink id={comment.id} />
            {externalReferenceViewObject.actions}
          </>
        ),
        children: (
          <Suspense fallback={<EuiLoadingSpinner />}>
            {externalReferenceViewObject.children}
          </Suspense>
        ),
      },
    ];
  },
});
