/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const EDIT = i18n.translate('xpack.siem.exceptions.editButtonLabel', {
  defaultMessage: 'Edit',
});

export const REMOVE = i18n.translate('xpack.siem.exceptions.removeButtonLabel', {
  defaultMessage: 'Remove',
});

export const COMMENTS_SHOW = (comments: number) =>
  i18n.translate('xpack.siem.exceptions.showCommentsLabel', {
    values: { comments },
    defaultMessage: 'Show ({comments}) {comments, plural, =1 {Comment} other {Comments}}',
  });

export const COMMENTS_HIDE = (comments: number) =>
  i18n.translate('xpack.siem.exceptions.hideCommentsLabel', {
    values: { comments },
    defaultMessage: 'Hide ({comments}) {comments, plural, =1 {Comment} other {Comments}}',
  });

export const DATE_CREATED = i18n.translate('xpack.siem.exceptions.dateCreatedLabel', {
  defaultMessage: 'Date created',
});

export const CREATED_BY = i18n.translate('xpack.siem.exceptions.createdByLabel', {
  defaultMessage: 'Created by',
});

export const COMMENT = i18n.translate('xpack.siem.exceptions.commentLabel', {
  defaultMessage: 'Comment',
});

export const OPERATING_SYSTEM = i18n.translate('xpack.siem.exceptions.operatingSystemLabel', {
  defaultMessage: 'OS',
});
