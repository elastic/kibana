/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { NonEmptyString } from '../../../shared_imports';
import { operatorIncluded } from '../../common/schemas';

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const endpointEntryMatch = t.exact(
  t.type({
    field: NonEmptyString,
    operator: operatorIncluded,
    type: t.keyof({ match: null }),
    value: NonEmptyString,
  })
);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type EndpointEntryMatch = t.TypeOf<typeof endpointEntryMatch>;
