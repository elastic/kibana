/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { NonEmptyString } from '../../siem_common_deps';
import { operator } from '../common/schemas';

export const entriesExists = t.exact(
  t.type({
    field: NonEmptyString,
    operator,
    type: t.keyof({ exists: null }),
  })
);
export type EntryExists = t.TypeOf<typeof entriesExists>;
