/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const title = t.string;
export type Title = t.TypeOf<typeof title>;
export const titleOrUndefined = t.union([title, t.undefined]);
export type TitleOrUndefined = t.TypeOf<typeof titleOrUndefined>;

export const description = t.string;
export type Description = t.TypeOf<typeof description>;
export const descriptionOrUndefined = t.union([description, t.undefined]);
export type DescriptionOrUndefined = t.TypeOf<typeof descriptionOrUndefined>;

export const command = t.string;
export type Command = t.TypeOf<typeof command>;
export const commandOrUndefined = t.union([command, t.undefined]);
export type CommandOrUndefined = t.TypeOf<typeof commandOrUndefined>;
