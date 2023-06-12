/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import type {
  AttachmentType,
  CommonAttachmentViewProps,
} from '../../../client/attachment_framework/types';
import { AttachmentActionType } from '../../../client/attachment_framework/types';
import { AttachmentTypeRegistry } from '../../../../common/registry';
import { getMockBuilderArgs } from '../mock';
import { createRegisteredAttachmentUserActionBuilder } from './registered_attachments';

const getLazyComponent = () =>
  React.lazy(() => {
    return Promise.resolve().then(() => {
      return {
        // eslint-disable-next-line react/display-name
        default: React.memo(() => {
          return <>{'My component'}</>;
        }),
      };
    });
  });

describe('createCommentUserActionBuilder', () => {
  const attachmentTypeId = 'test';
  const builderArgs = getMockBuilderArgs();
  const registry = new AttachmentTypeRegistry<AttachmentType<CommonAttachmentViewProps>>(
    attachmentTypeId
  );

  const viewProps = { foo: 'bar' };
  const viewObjectProps = {
    timelineAvatar: 'casesApp',
    children: getLazyComponent(),
    event: <>{'My event'}</>,
  };

  const getAttachmentViewObject = jest.fn().mockReturnValue(viewObjectProps);
  const getAttachmentRemovalObject = jest.fn();
  const getAttachmentViewProps = jest.fn().mockReturnValue(viewProps);
  const getId = jest.fn().mockReturnValue(attachmentTypeId);

  const item = {
    id: attachmentTypeId,
    icon: 'test-icon',
    displayName: 'Test',
    getAttachmentViewObject,
    getAttachmentRemovalObject,
    hideDefaultActions: false,
  };

  registry.register(item);

  const userActionBuilderArgs = {
    userAction: builderArgs.userAction,
    userProfiles: builderArgs.userProfiles,
    caseData: builderArgs.caseData,
    handleDeleteComment: builderArgs.handleDeleteComment,
    getId,
    getAttachmentViewProps,
    isLoading: false,
    comment: builderArgs.comments[0],
    registry,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds the user action correctly', async () => {
    expect(
      createRegisteredAttachmentUserActionBuilder(userActionBuilderArgs).build()
    ).toMatchSnapshot();
  });

  it('returns an unknown user action if the attachment type is not registered', async () => {
    expect(
      createRegisteredAttachmentUserActionBuilder({
        ...userActionBuilderArgs,
        getId: () => 'invalid',
      }).build()
    ).toMatchSnapshot();
  });

  it('calls getAttachmentViewObject with correct arguments', async () => {
    createRegisteredAttachmentUserActionBuilder(userActionBuilderArgs).build();

    expect(getAttachmentViewProps).toHaveBeenCalled();
    expect(getAttachmentViewObject).toBeCalledWith({
      ...viewProps,
      attachmentId: builderArgs.userAction.id,
      caseData: { id: builderArgs.caseData.id, title: builderArgs.caseData.title },
    });
  });

  it('builds the action correctly', async () => {
    const actions = [
      {
        type: AttachmentActionType.CUSTOM,
        render: () => <>{'My button'}</>,
        isPrimary: true,
      },
      {
        type: AttachmentActionType.BUTTON,
        onClick: () => {},
        iconType: 'danger',
        label: 'My button 2',
        isPrimary: false,
      },
    ];

    getAttachmentViewObject.mockReturnValue({ ...viewObjectProps, getActions: () => actions });

    expect(
      createRegisteredAttachmentUserActionBuilder(userActionBuilderArgs).build()
    ).toMatchSnapshot();
  });
});
