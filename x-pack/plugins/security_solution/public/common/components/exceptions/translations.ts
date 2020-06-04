/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const EDIT = i18n.translate('xpack.securitySolution.exceptions.editButtonLabel', {
  defaultMessage: 'Edit',
});

export const REMOVE = i18n.translate('xpack.securitySolution.exceptions.removeButtonLabel', {
  defaultMessage: 'Remove',
});

export const COMMENTS_SHOW = (comments: number) =>
  i18n.translate('xpack.securitySolution.exceptions.showCommentsLabel', {
    values: { comments },
    defaultMessage: 'Show ({comments}) {comments, plural, =1 {Comment} other {Comments}}',
  });

export const COMMENTS_HIDE = (comments: number) =>
  i18n.translate('xpack.securitySolution.exceptions.hideCommentsLabel', {
    values: { comments },
    defaultMessage: 'Hide ({comments}) {comments, plural, =1 {Comment} other {Comments}}',
  });

export const DATE_CREATED = i18n.translate('xpack.securitySolution.exceptions.dateCreatedLabel', {
  defaultMessage: 'Date created',
});

export const CREATED_BY = i18n.translate('xpack.securitySolution.exceptions.createdByLabel', {
  defaultMessage: 'Created by',
});

export const COMMENT = i18n.translate('xpack.securitySolution.exceptions.commentLabel', {
  defaultMessage: 'Comment',
});

export const COMMENT_EVENT = i18n.translate('xpack.securitySolution.exceptions.commentEventLabel', {
  defaultMessage: 'added a comment',
});

export const OPERATING_SYSTEM = i18n.translate(
  'xpack.securitySolution.exceptions.operatingSystemLabel',
  {
    defaultMessage: 'OS',
  }
);

export const SEARCH_DEFAULT = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.searchDefaultPlaceholder',
  {
    defaultMessage: 'Search field (default)',
  }
);

export const ADD_EXCEPTION_LABEL = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.addExceptionLabel',
  {
    defaultMessage: 'Add new exception',
  }
);

export const ADD_TO_ENDPOINT_LIST = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.addToEndpointListLabel',
  {
    defaultMessage: 'Add to endpoint list',
  }
);

export const ADD_TO_DETECTIONS_LIST = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.addToDetectionsListLabel',
  {
    defaultMessage: 'Add to detections list',
  }
);

export const EXCEPTION_EMPTY_PROMPT_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.emptyPromptTitle',
  {
    defaultMessage: 'You have no exceptions',
  }
);

export const EXCEPTION_EMPTY_PROMPT_BODY = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.emptyPromptBody',
  {
    defaultMessage:
      'This could be a description of what exceptions are and what their use case could be. Wow such tempt much ruin diet wrinkler clouds, you are doin me a concern. H*cksub woofer shibe clouds.',
  }
);

export const FETCH_LIST_ERROR = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.fetchingListError',
  {
    defaultMessage: 'Error fetching exceptions',
  }
);

export const DELETE_EXCEPTION_ERROR = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.deleteExceptionError',
  {
    defaultMessage: 'Error deleting exception',
  }
);
