/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { LimitedSizeArray, NonEmptyString } from '@kbn/securitysolution-io-ts-types';
import { MAX_NUMBER_OF_NEW_TERMS_FIELDS } from '../../../../constants';

// Attributes specific to New Terms rules

/**
 * New terms rule type supports a limited number of fields. Max number of fields is 3 and defined in common constants as MAX_NUMBER_OF_NEW_TERMS_FIELDS
 */
export type NewTermsFields = t.TypeOf<typeof NewTermsFields>;
export const NewTermsFields = LimitedSizeArray({
  codec: t.string,
  minSize: 1,
  maxSize: MAX_NUMBER_OF_NEW_TERMS_FIELDS,
});

export type HistoryWindowStart = t.TypeOf<typeof HistoryWindowStart>;
export const HistoryWindowStart = NonEmptyString;
