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
import { memoize } from 'lodash';

import { EuiCallOut, EuiCode, EuiLoadingSpinner } from '@elastic/eui';
import type { AttachmentType } from '../../../client/attachment_framework/types';
import type { AttachmentTypeRegistry } from '../../../../common/registry';
import type { CommentResponse } from '../../../../common/api';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import { UserActionTimestamp } from '../timestamp';
import type { SnakeToCamelCase } from '../../../../common/types';
import { ATTACHMENT_NOT_REGISTERED_ERROR, DEFAULT_EVENT_ATTACHMENT_TITLE } from './translations';
import { UserActionContentToolbar } from '../content_toolbar';
import { HoverableUserWithAvatarResolver } from '../../user_profiles/hoverable_user_with_avatar_resolver';
import { RegisteredAttachmentsPropertyActions } from '../property_actions/registered_attachments_property_actions';

type BuilderArgs<C, R> = Pick<
  UserActionBuilderArgs,
  'userAction' | 'caseData' | 'handleDeleteComment' | 'userProfiles'
> & {
  comment: SnakeToCamelCase<C>;
  registry: R;
  isLoading: boolean;
  getId: () => string;
  getAttachmentViewProps: () => object;
};

/**
 * Provides a render function for attachment type
 */
const getAttachmentRenderer = memoize((attachmentType: AttachmentType<unknown>) => {
  const attachmentViewObject = attachmentType.getAttachmentViewObject();

  let AttachmentElement: React.ReactElement;

  const renderCallback = (props: object) => {
    if (!attachmentViewObject.children) return;

    if (!AttachmentElement) {
      AttachmentElement = React.createElement(attachmentViewObject.children, props);
    } else {
      AttachmentElement = React.cloneElement(AttachmentElement, props);
    }

    return <Suspense fallback={<EuiLoadingSpinner />}>{AttachmentElement}</Suspense>;
  };

  return renderCallback;
});

export const createRegisteredAttachmentUserActionBuilder = <
  C extends CommentResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  R extends AttachmentTypeRegistry<AttachmentType<any>>
>({
  userAction,
  userProfiles,
  comment,
  registry,
  caseData,
  isLoading,
  getId,
  getAttachmentViewProps,
  handleDeleteComment,
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
            <HoverableUserWithAvatarResolver user={comment.createdBy} userProfiles={userProfiles} />
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
    const renderer = getAttachmentRenderer(attachmentType);

    const attachmentViewObject = attachmentType.getAttachmentViewObject();
    const props = {
      ...getAttachmentViewProps(),
      caseData: { id: caseData.id, title: caseData.title },
    };

    return [
      {
        username: (
          <HoverableUserWithAvatarResolver user={comment.createdBy} userProfiles={userProfiles} />
        ),
        className: `comment-${comment.type}-attachment-${attachmentTypeId}`,
        event: attachmentViewObject.event,
        'data-test-subj': `comment-${comment.type}-${attachmentTypeId}`,
        timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
        timelineAvatar: attachmentViewObject.timelineAvatar,
        actions: (
          <UserActionContentToolbar id={comment.id}>
            {attachmentViewObject.actions}
            <RegisteredAttachmentsPropertyActions
              isLoading={isLoading}
              onDelete={() => handleDeleteComment(comment.id)}
            />
          </UserActionContentToolbar>
        ),
        children: renderer(props),
      },
    ];
  },
});
