/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const DETECTION_LIST = i18n.translate(
  'xpack.securitySolution.exceptions.detectionListLabel',
  {
    defaultMessage: 'Detection list',
  }
);

export const ENDPOINT_LIST = i18n.translate('xpack.securitySolution.exceptions.endpointListLabel', {
  defaultMessage: 'Endpoint list',
});

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
    defaultMessage: 'Search field (ex: host.name)',
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
      'You can add an exception to fine tune the rule so that it suppresses alerts that meet specified conditions. Exceptions leverage detection accuracy, which can help reduce the number of false positives.',
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

export const ITEMS_PER_PAGE = (items: number) =>
  i18n.translate('xpack.securitySolution.exceptions.exceptionsPaginationLabel', {
    values: { items },
    defaultMessage: 'Items per page: {items}',
  });

export const NUMBER_OF_ITEMS = (items: number) =>
  i18n.translate('xpack.securitySolution.exceptions.paginationNumberOfItemsLabel', {
    values: { items },
    defaultMessage: '{items} items',
  });

export const REFRESH = i18n.translate('xpack.securitySolution.exceptions.utilityRefreshLabel', {
  defaultMessage: 'Refresh',
});

export const SHOWING_EXCEPTIONS = (items: number) =>
  i18n.translate('xpack.securitySolution.exceptions.utilityNumberExceptionsLabel', {
    values: { items },
    defaultMessage: 'Showing {items} {items, plural, =1 {exception} other {exceptions}}',
  });

export const FIELD = i18n.translate('xpack.securitySolution.exceptions.fieldDescription', {
  defaultMessage: 'Field',
});

export const OPERATOR = i18n.translate('xpack.securitySolution.exceptions.operatorDescription', {
  defaultMessage: 'Operator',
});

export const VALUE = i18n.translate('xpack.securitySolution.exceptions.valueDescription', {
  defaultMessage: 'Value',
});

export const EXCEPTION_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionFieldPlaceholderDescription',
  {
    defaultMessage: 'Search',
  }
);

export const EXCEPTION_OPERATOR_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionOperatorPlaceholderDescription',
  {
    defaultMessage: 'Operator',
  }
);

export const EXCEPTION_FIELD_VALUE_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionFieldValuePlaceholderDescription',
  {
    defaultMessage: 'Search field value...',
  }
);

export const EXCEPTION_FIELD_LISTS_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionListsPlaceholderDescription',
  {
    defaultMessage: 'Search for list...',
  }
);

export const ADD_EXCEPTION_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.addExceptionTitle',
  {
    defaultMessage: 'Add exception',
  }
);

export const AND = i18n.translate('xpack.securitySolution.exceptions.andDescription', {
  defaultMessage: 'AND',
});

export const OR = i18n.translate('xpack.securitySolution.exceptions.orDescription', {
  defaultMessage: 'OR',
});

export const ADD_NESTED_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.exceptions.addNestedDescription',
  {
    defaultMessage: 'Add nested condition',
  }
);
