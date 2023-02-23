/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export type TimelineTemplateId = t.TypeOf<typeof TimelineTemplateId>;
export const TimelineTemplateId = t.string; // should be non-empty string?

export type TimelineTemplateTitle = t.TypeOf<typeof TimelineTemplateTitle>;
export const TimelineTemplateTitle = t.string; // should be non-empty string?
