/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILE_ATTACHMENT_TYPE } from '../../common/api';
import { CASE_COMMENT_SAVED_OBJECT } from '../../common/constants';
import { buildFilter } from '../client/utils';

/**
 * Creates a filter used in saved object client requests to scope the request to only file attachments.
 */
export const createSavedObjectFileFilter = () =>
  buildFilter({
    filters: FILE_ATTACHMENT_TYPE,
    field: 'externalReferenceAttachmentTypeId',
    operator: 'or',
    type: CASE_COMMENT_SAVED_OBJECT,
  });
