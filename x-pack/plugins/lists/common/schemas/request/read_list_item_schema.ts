/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { id, list_id, value } from '../common/schemas';
import { Identity, RequiredKeepUndefined } from '../../types';

export const readListItemSchema = t.exact(t.partial({ id, list_id, value }));

export type ReadListItemSchemaPartial = Identity<t.TypeOf<typeof readListItemSchema>>;
export type ReadListItemSchema = RequiredKeepUndefined<t.TypeOf<typeof readListItemSchema>>;
