/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INDICATOR_DESTINATION_PATH } from '../../../../../../../common/constants';

export const threatMatchSubFields = ['matched.atomic', 'matched.field', 'matched.type'];
const indicatorSubFields = ['event.dataset', 'event.reference', 'provider'];

export const requiredFields = [...threatMatchSubFields, ...indicatorSubFields].map(
  (subField) => `${INDICATOR_DESTINATION_PATH}.${subField}`
);
