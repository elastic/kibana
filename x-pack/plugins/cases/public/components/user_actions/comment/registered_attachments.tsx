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
import { memoize, partition } from 'lodash';

import { EuiCallOut, EuiCode, EuiLoadingSpinner, EuiButtonIcon, EuiFlexItem } from '@elastic/eui';

import type {
  AttachmentType,
  AttachmentViewObject,
  CommonAttachmentViewProps,
} from '../../../client/attachment_framework/types';

import { AttachmentActionType } from '../../../client/attachment_framework/types';
import { UserActionTimestamp } from '../timestamp';
import type { AttachmentTypeRegistry } from '../../../../common/registry';
import type { Attachment } from '../../../../common/types/domain';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import type { SnakeToCamelCase } from '../../../../common/types';
import {
  ATTACHMENT_NOT_REGISTERED_ERROR,
  DEFAULT_EVENT_ATTACHMENT_TITLE,
  DELETE_REGISTERED_ATTACHMENT,
} from './translations';
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
 * Provides a render function for attachment type.
 * memoize uses the first argument as the caching key.
 * The argument is intentionally declared and unused to
 * be able for TS to warn us in case we forgot to provide one.
 */
const getAttachmentRenderer = memoize((cachingKey: string) => {
  let AttachmentElement: React.ReactElement;

  const renderCallback = (
    attachmentViewObject: AttachmentViewObject<CommonAttachmentViewProps>,
    props: CommonAttachmentViewProps
  ) => {
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
  C extends Attachment,
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
            <EuiCallOut title={ATTACHMENT_NOT_REGISTERED_ERROR} color="danger" iconType="warning" />
          ),
        },
      ];
    }

    const attachmentType = registry.get(attachmentTypeId);

    const props = {
      ...getAttachmentViewProps(),
      attachmentId: comment.id,
      caseData: { id: caseData.id, title: caseData.title },
    };

    const attachmentViewObject = attachmentType.getAttachmentViewObject(props);

    const renderer = getAttachmentRenderer(userAction.id);
    const actions = attachmentViewObject.getActions?.(props) ?? [];
    const [primaryActions, nonPrimaryActions] = partition(actions, 'isPrimary');
    const visiblePrimaryActions = primaryActions.slice(0, 2);
    const nonVisiblePrimaryActions = primaryActions.slice(2, primaryActions.length);

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
            {visiblePrimaryActions.map(
              (action) =>
                (action.type === AttachmentActionType.BUTTON && (
                  <EuiFlexItem
                    grow={false}
                    data-test-subj={`attachment-${attachmentTypeId}-${comment.id}`}
                    key={`attachment-${attachmentTypeId}-${comment.id}`}
                  >
                    <EuiButtonIcon
                      aria-label={action.label}
                      iconType={action.iconType}
                      color={action.color ?? 'text'}
                      onClick={action.onClick}
                      data-test-subj={`attachment-${attachmentTypeId}-${comment.id}-${action.iconType}`}
                      key={`attachment-${attachmentTypeId}-${comment.id}-${action.iconType}`}
                    />
                  </EuiFlexItem>
                )) ||
                (action.type === AttachmentActionType.CUSTOM && action.render())
            )}
            <RegisteredAttachmentsPropertyActions
              isLoading={isLoading}
              onDelete={() => handleDeleteComment(comment.id, DELETE_REGISTERED_ATTACHMENT)}
              registeredAttachmentActions={[...nonVisiblePrimaryActions, ...nonPrimaryActions]}
              hideDefaultActions={!!attachmentViewObject.hideDefaultActions}
            />
          </UserActionContentToolbar>
        ),
        children: renderer(attachmentViewObject, props),
      },
    ];
  },
});
