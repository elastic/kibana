/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTENT_FIELD, RESOURCE_FIELD } from '../../common/constants';
import { renderColumn } from '../components/virtual_columns/column';

export const createCustomGridColumnsConfiguration = () => ({
  [CONTENT_FIELD]: renderColumn(CONTENT_FIELD),
  [RESOURCE_FIELD]: renderColumn(RESOURCE_FIELD),
});
