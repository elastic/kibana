/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
export * from '../../common/translations';

export const ENDPOINT_DELETION_FAILED = i18n.translate(
  'xpack.searchInferenceEndpoints.deleteEndpoint.endpointDeletionFailed',
  {
    defaultMessage: 'Endpoint deletion failed',
  }
);

export const DELETE_SUCCESS = i18n.translate(
  'xpack.searchInferenceEndpoints.deleteEndpoint.deleteSuccess',
  {
    defaultMessage: 'The inference endpoint has been deleted sucessfully.',
  }
);
