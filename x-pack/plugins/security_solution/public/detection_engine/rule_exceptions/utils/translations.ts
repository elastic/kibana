/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

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

export const COMMENT_EVENT = i18n.translate('xpack.securitySolution.exceptions.commentEventLabel', {
  defaultMessage: 'added a comment',
});

export const OPERATING_SYSTEM_LABEL = i18n.translate(
  'xpack.securitySolution.exceptions.operatingSystemFullLabel',
  {
    defaultMessage: 'Operating System',
  }
);

export const ADD_TO_ENDPOINT_LIST = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.addToEndpointListLabel',
  {
    defaultMessage: 'Add endpoint exception',
  }
);

export const ADD_TO_DETECTIONS_LIST = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.addToDetectionsListLabel',
  {
    defaultMessage: 'Add rule exception',
  }
);

export const ADD_COMMENT_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.addCommentPlaceholder',
  {
    defaultMessage: 'Add a new comment...',
  }
);

export const ADD_TO_CLIPBOARD = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.addToClipboard',
  {
    defaultMessage: 'Comment',
  }
);

export const CLEAR_EXCEPTIONS_LABEL = i18n.translate(
  'xpack.securitySolution.exceptions.clearExceptionsLabel',
  {
    defaultMessage: 'Remove Exception List',
  }
);

export const ADD_EXCEPTION_FETCH_404_ERROR = (listId: string) =>
  i18n.translate('xpack.securitySolution.exceptions.fetch404Error', {
    values: { listId },
    defaultMessage:
      'The associated exception list ({listId}) no longer exists. Please remove the missing exception list to add additional exceptions to the detection rule.',
  });

export const ADD_EXCEPTION_FETCH_ERROR = i18n.translate(
  'xpack.securitySolution.exceptions.fetchError',
  {
    defaultMessage: 'Error fetching exception list',
  }
);

export const ERROR = i18n.translate('xpack.securitySolution.exceptions.errorLabel', {
  defaultMessage: 'Error',
});

export const CANCEL = i18n.translate('xpack.securitySolution.exceptions.cancelLabel', {
  defaultMessage: 'Cancel',
});

export const MODAL_ERROR_ACCORDION_TEXT = i18n.translate(
  'xpack.securitySolution.exceptions.modalErrorAccordionText',
  {
    defaultMessage: 'Show rule reference information:',
  }
);

export const DISASSOCIATE_LIST_SUCCESS = (id: string) =>
  i18n.translate('xpack.securitySolution.exceptions.disassociateListSuccessText', {
    values: { id },
    defaultMessage: 'Exception list ({id}) has successfully been removed',
  });

export const DISASSOCIATE_EXCEPTION_LIST_ERROR = i18n.translate(
  'xpack.securitySolution.exceptions.disassociateExceptionListError',
  {
    defaultMessage: 'Failed to remove exception list',
  }
);

export const OPERATING_SYSTEM_WINDOWS = i18n.translate(
  'xpack.securitySolution.exceptions.operatingSystemWindows',
  {
    defaultMessage: 'Windows',
  }
);

export const OPERATING_SYSTEM_MAC = i18n.translate(
  'xpack.securitySolution.exceptions.operatingSystemMac',
  {
    defaultMessage: 'macOS',
  }
);

export const OPERATING_SYSTEM_WINDOWS_AND_MAC = i18n.translate(
  'xpack.securitySolution.exceptions.operatingSystemWindowsAndMac',
  {
    defaultMessage: 'Windows and macOS',
  }
);

export const OPERATING_SYSTEM_LINUX = i18n.translate(
  'xpack.securitySolution.exceptions.operatingSystemLinux',
  {
    defaultMessage: 'Linux',
  }
);

export const ERROR_FETCHING_REFERENCES_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.fetchingReferencesErrorToastTitle',
  {
    defaultMessage: 'Error fetching exception references',
  }
);
