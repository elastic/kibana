/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';

import { EuiCallOut, EuiCode, EuiLoadingSpinner } from '@elastic/eui';
import { AttachmentType } from '../../../client/attachment_framework/types';
import { AttachmentTypeRegistry } from '../../../../common/registry';
import { CommentResponse } from '../../../../common/api';
import { UserActionBuilder, UserActionBuilderArgs } from '../types';
import { UserActionTimestamp } from '../timestamp';
import { SnakeToCamelCase } from '../../../../common/types';
import { UserActionUsernameWithAvatar } from '../avatar_username';
import { UserActionCopyLink } from '../copy_link';
import { ATTACHMENT_NOT_REGISTERED_ERROR, DEFAULT_EVENT_ATTACHMENT_TITLE } from './translations';

type BuilderArgs<C, R> = Pick<UserActionBuilderArgs, 'userAction' | 'caseData'> & {
  comment: SnakeToCamelCase<C>;
  registry: R;
  getId: () => string;
  getAttachmentViewProps: () => object;
};

export const createRegisteredAttachmentUserActionBuilder = <
  C extends CommentResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  R extends AttachmentTypeRegistry<AttachmentType<any>>
>({
  userAction,
  comment,
  registry,
  caseData,
  getId,
  getAttachmentViewProps,
}: BuilderArgs<C, R>): ReturnType<UserActionBuilder> => ({
  // TODO: Fix this manually. Issue #123375
  // eslint-disable-next-line react/display-name
  build: () => {
    const attachmentTypeId: string = getId();
    const isTypeRegistered = registry.has(attachmentTypeId);

    if (!isTypeRegistered) {
      return [
        {
          username: (
            <UserActionUsernameWithAvatar
              username={comment.createdBy.username}
              fullName={comment.createdBy.fullName}
            />
          ),
          event: (
            <>
              {`${DEFAULT_EVENT_ATTACHMENT_TITLE} `}
              <EuiCode>{attachmentTypeId}</EuiCode>
            </>
          ),
          className: `comment-${comment.type}-not-found`,
          'data-test-subj': `comment-${comment.type}-not-found`,
          timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
          children: (
            <EuiCallOut title={ATTACHMENT_NOT_REGISTERED_ERROR} color="danger" iconType="alert" />
          ),
        },
      ];
    }

    const attachmentType = registry.get(attachmentTypeId);

    const attachmentViewObject = attachmentType.getAttachmentViewObject();
    const props = {
      ...getAttachmentViewProps(),
      caseData: { id: caseData.id, title: caseData.title },
    };

    return [
      {
        username: (
          <UserActionUsernameWithAvatar
            username={comment.createdBy.username}
            fullName={comment.createdBy.fullName}
          />
        ),
        className: `comment-${comment.type}-attachment-${attachmentTypeId}`,
        event: attachmentViewObject.event,
        'data-test-subj': `comment-${comment.type}-${attachmentTypeId}`,
        timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
        timelineAvatar: attachmentViewObject.timelineAvatar,
        actions: (
          <>
            <UserActionCopyLink id={comment.id} />
            {attachmentViewObject.actions}
          </>
        ),
        children: attachmentViewObject.children ? (
          <Suspense fallback={<EuiLoadingSpinner />}>
            {React.createElement(attachmentViewObject.children, props)}
          </Suspense>
        ) : undefined,
      },
    ];
  },
});
