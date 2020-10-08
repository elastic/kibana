/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const INSPECT = i18n.translate('xpack.securitySolution.inspectDescription', {
  defaultMessage: 'Inspect',
});

export const CLOSE = i18n.translate('xpack.securitySolution.inspect.modal.closeTitle', {
  defaultMessage: 'Close',
});

export const SOMETHING_WENT_WRONG = i18n.translate(
  'xpack.securitySolution.inspect.modal.somethingWentWrongDescription',
  {
    defaultMessage: 'Sorry about that, something went wrong.',
  }
);
export const INDEX_PATTERN = i18n.translate(
  'xpack.securitySolution.inspect.modal.indexPatternLabel',
  {
    defaultMessage: 'Index pattern',
  }
);

export const INDEX_PATTERN_DESC = i18n.translate(
  'xpack.securitySolution.inspect.modal.indexPatternDescription',
  {
    defaultMessage:
      'The index pattern that connected to the Elasticsearch indices. These indices can be configured in Kibana > Advanced Settings.',
  }
);

export const QUERY_TIME = i18n.translate('xpack.securitySolution.inspect.modal.queryTimeLabel', {
  defaultMessage: 'Query time',
});

export const QUERY_TIME_DESC = i18n.translate(
  'xpack.securitySolution.inspect.modal.queryTimeDescription',
  {
    defaultMessage:
      'The time it took to process the query. Does not include the time to send the request or parse it in the browser.',
  }
);

export const REQUEST_TIMESTAMP = i18n.translate(
  'xpack.securitySolution.inspect.modal.reqTimestampLabel',
  {
    defaultMessage: 'Request timestamp',
  }
);

export const REQUEST_TIMESTAMP_DESC = i18n.translate(
  'xpack.securitySolution.inspect.modal.reqTimestampDescription',
  {
    defaultMessage: 'Time when the start of the request has been logged',
  }
);

export const NO_ALERT_INDEX_FOUND = i18n.translate(
  'xpack.securitySolution.inspect.modal.noAlertIndexFound',
  {
    defaultMessage: 'No alert index found',
  }
);
