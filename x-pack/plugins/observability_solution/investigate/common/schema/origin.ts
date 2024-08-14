/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

const blankOriginSchema = t.type({ type: t.literal('blank') });
const alertOriginSchema = t.type({ type: t.literal('alert'), id: t.string });

export { alertOriginSchema, blankOriginSchema };
