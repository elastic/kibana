/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';

import type { SnakeToCamelCase } from '../../../../common/types';
import type { CommentUserAction } from '../../../../common/types/domain';
import { UserActionActions, AttachmentType } from '../../../../common/types/domain';
import type { AttachmentTypeRegistry } from '../../../../common/registry';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import { createCommonUpdateUserActionBuilder } from '../common';
import type { AttachmentUI } from '../../../containers/types';
import * as i18n from './translations';
import { createUserAttachmentUserActionBuilder } from './user';
import { createAlertAttachmentUserActionBuilder } from './alert';
import { createActionAttachmentUserActionBuilder } from './actions';
import { createExternalReferenceAttachmentUserActionBuilder } from './external_reference';
import { createPersistableStateAttachmentUserActionBuilder } from './persistable_state';
import type { AttachmentType as AttachmentFrameworkAttachmentType } from '../../../client/attachment_framework/types';

const getUpdateLabelTitle = () => `${i18n.EDITED_FIELD} ${i18n.COMMENT.toLowerCase()}`;

interface DeleteLabelTitle {
  userAction: SnakeToCamelCase<CommentUserAction>;
  caseData: UserActionBuilderArgs['caseData'];
  externalReferenceAttachmentTypeRegistry: UserActionBuilderArgs['externalReferenceAttachmentTypeRegistry'];
  persistableStateAttachmentTypeRegistry: UserActionBuilderArgs['persistableStateAttachmentTypeRegistry'];
}

const getDeleteLabelTitle = ({
  userAction,
  caseData,
  externalReferenceAttachmentTypeRegistry,
  persistableStateAttachmentTypeRegistry,
}: DeleteLabelTitle) => {
  const { comment } = userAction.payload;

  if (comment.type === AttachmentType.alert) {
    const totalAlerts = Array.isArray(comment.alertId) ? comment.alertId.length : 1;
    const alertLabel = i18n.MULTIPLE_ALERTS(totalAlerts);

    return `${i18n.REMOVED_FIELD} ${alertLabel}`;
  }

  if (comment.type === AttachmentType.externalReference) {
    return getDeleteLabelFromRegistry({
      caseData,
      registry: externalReferenceAttachmentTypeRegistry,
      getId: () => comment.externalReferenceAttachmentTypeId,
      getAttachmentProps: () => ({
        externalReferenceId: comment.externalReferenceId,
        externalReferenceMetadata: comment.externalReferenceMetadata,
      }),
    });
  }

  if (comment.type === AttachmentType.persistableState) {
    return getDeleteLabelFromRegistry({
      caseData,
      registry: persistableStateAttachmentTypeRegistry,
      getId: () => comment.persistableStateAttachmentTypeId,
      getAttachmentProps: () => ({
        persistableStateAttachmentTypeId: comment.persistableStateAttachmentTypeId,
        persistableStateAttachmentState: comment.persistableStateAttachmentState,
      }),
    });
  }

  return `${i18n.REMOVED_FIELD} ${i18n.COMMENT.toLowerCase()}`;
};

interface GetDeleteLabelFromRegistryArgs<R> {
  caseData: UserActionBuilderArgs['caseData'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registry: AttachmentTypeRegistry<AttachmentFrameworkAttachmentType<any>>;
  getId: () => string;
  getAttachmentProps: () => object;
}

const getDeleteLabelFromRegistry = <R,>({
  caseData,
  registry,
  getId,
  getAttachmentProps,
}: GetDeleteLabelFromRegistryArgs<R>) => {
  const registeredAttachmentCommonLabel = `${i18n.REMOVED_FIELD} ${i18n.ATTACHMENT.toLowerCase()}`;
  const attachmentTypeId: string = getId();
  const isTypeRegistered = registry.has(attachmentTypeId);

  if (!isTypeRegistered) {
    return registeredAttachmentCommonLabel;
  }

  const props = {
    ...getAttachmentProps(),
    caseData: { id: caseData.id, title: caseData.title },
  };

  const attachmentType = registry.get(attachmentTypeId);
  const attachmentLabel = attachmentType.getAttachmentRemovalObject?.(props).event ?? null;

  return attachmentLabel != null ? attachmentLabel : registeredAttachmentCommonLabel;
};

const getDeleteCommentUserAction = ({
  userAction,
  userProfiles,
  caseData,
  externalReferenceAttachmentTypeRegistry,
  persistableStateAttachmentTypeRegistry,
  handleOutlineComment,
}: {
  userAction: SnakeToCamelCase<CommentUserAction>;
} & Pick<
  UserActionBuilderArgs,
  | 'handleOutlineComment'
  | 'userProfiles'
  | 'externalReferenceAttachmentTypeRegistry'
  | 'persistableStateAttachmentTypeRegistry'
  | 'caseData'
>): EuiCommentProps[] => {
  const label = getDeleteLabelTitle({
    userAction,
    caseData,
    externalReferenceAttachmentTypeRegistry,
    persistableStateAttachmentTypeRegistry,
  });

  const commonBuilder = createCommonUpdateUserActionBuilder({
    userAction,
    userProfiles,
    handleOutlineComment,
    label,
    icon: 'cross',
  });

  return commonBuilder.build();
};

const getCreateCommentUserAction = ({
  appId,
  userAction,
  userProfiles,
  caseData,
  externalReferenceAttachmentTypeRegistry,
  persistableStateAttachmentTypeRegistry,
  comment,
  commentRefs,
  manageMarkdownEditIds,
  selectedOutlineCommentId,
  loadingCommentIds,
  euiTheme,
  handleManageMarkdownEditId,
  handleSaveComment,
  handleManageQuote,
  handleDeleteComment,
  getRuleDetailsHref,
  loadingAlertData,
  onRuleDetailsClick,
  alertData,
  onShowAlertDetails,
  actionsNavigation,
}: {
  userAction: SnakeToCamelCase<CommentUserAction>;
  comment: AttachmentUI;
} & Omit<
  UserActionBuilderArgs,
  'comments' | 'index' | 'handleOutlineComment' | 'currentUserProfile'
>): EuiCommentProps[] => {
  switch (comment.type) {
    case AttachmentType.user:
      const userBuilder = createUserAttachmentUserActionBuilder({
        appId,
        userProfiles,
        comment,
        outlined: comment.id === selectedOutlineCommentId,
        isEdit: manageMarkdownEditIds.includes(comment.id),
        commentRefs,
        isLoading: loadingCommentIds.includes(comment.id),
        caseId: caseData.id,
        euiTheme,
        handleManageMarkdownEditId,
        handleSaveComment,
        handleManageQuote,
        handleDeleteComment,
      });

      return userBuilder.build();

    case AttachmentType.alert:
      const alertBuilder = createAlertAttachmentUserActionBuilder({
        userProfiles,
        alertData,
        comment,
        userAction,
        getRuleDetailsHref,
        loadingAlertData,
        onRuleDetailsClick,
        onShowAlertDetails,
        handleDeleteComment,
        loadingCommentIds,
      });

      return alertBuilder.build();

    case AttachmentType.actions:
      const actionBuilder = createActionAttachmentUserActionBuilder({
        userProfiles,
        userAction,
        comment,
        actionsNavigation,
      });

      return actionBuilder.build();

    case AttachmentType.externalReference:
      const externalReferenceBuilder = createExternalReferenceAttachmentUserActionBuilder({
        userAction,
        userProfiles,
        comment,
        externalReferenceAttachmentTypeRegistry,
        caseData,
        isLoading: loadingCommentIds.includes(comment.id),
        handleDeleteComment,
      });

      return externalReferenceBuilder.build();

    case AttachmentType.persistableState:
      const persistableBuilder = createPersistableStateAttachmentUserActionBuilder({
        userAction,
        userProfiles,
        comment,
        persistableStateAttachmentTypeRegistry,
        caseData,
        isLoading: loadingCommentIds.includes(comment.id),
        handleDeleteComment,
      });

      return persistableBuilder.build();
    default:
      return [];
  }
};

export const createCommentUserActionBuilder: UserActionBuilder = ({
  appId,
  caseData,
  casesConfiguration,
  userProfiles,
  externalReferenceAttachmentTypeRegistry,
  persistableStateAttachmentTypeRegistry,
  userAction,
  commentRefs,
  manageMarkdownEditIds,
  selectedOutlineCommentId,
  loadingCommentIds,
  loadingAlertData,
  alertData,
  euiTheme,
  getRuleDetailsHref,
  onRuleDetailsClick,
  onShowAlertDetails,
  handleManageMarkdownEditId,
  handleSaveComment,
  handleDeleteComment,
  handleManageQuote,
  handleOutlineComment,
  actionsNavigation,
  caseConnectors,
}) => ({
  build: () => {
    const commentUserAction = userAction as SnakeToCamelCase<CommentUserAction>;

    if (commentUserAction.action === UserActionActions.delete) {
      return getDeleteCommentUserAction({
        userAction: commentUserAction,
        caseData,
        handleOutlineComment,
        userProfiles,
        externalReferenceAttachmentTypeRegistry,
        persistableStateAttachmentTypeRegistry,
      });
    }

    const comment = caseData.comments.find((c) => c.id === commentUserAction.commentId);

    if (comment == null) {
      return [];
    }

    if (commentUserAction.action === UserActionActions.create) {
      const commentAction = getCreateCommentUserAction({
        appId,
        caseData,
        casesConfiguration,
        userProfiles,
        userAction: commentUserAction,
        externalReferenceAttachmentTypeRegistry,
        persistableStateAttachmentTypeRegistry,
        comment,
        commentRefs,
        manageMarkdownEditIds,
        selectedOutlineCommentId,
        loadingCommentIds,
        loadingAlertData,
        alertData,
        euiTheme,
        getRuleDetailsHref,
        onRuleDetailsClick,
        onShowAlertDetails,
        handleManageMarkdownEditId,
        handleSaveComment,
        handleDeleteComment,
        handleManageQuote,
        actionsNavigation,
        caseConnectors,
      });

      return commentAction;
    }

    const label = getUpdateLabelTitle();
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      userProfiles,
      handleOutlineComment,
      label,
      icon: 'dot',
    });

    return commonBuilder.build();
  },
});
