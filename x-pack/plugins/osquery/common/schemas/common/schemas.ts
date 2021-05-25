/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const name = t.string;
export type Name = t.TypeOf<typeof name>;
export const nameOrUndefined = t.union([name, t.undefined]);
export type NameOrUndefined = t.TypeOf<typeof nameOrUndefined>;

export const agentSelection = t.type({
  agents: t.array(t.string),
  allAgentsSelected: t.boolean,
  platformsSelected: t.array(t.string),
  policiesSelected: t.array(t.string),
});
export type AgentSelection = t.TypeOf<typeof agentSelection>;
export const agentSelectionOrUndefined = t.union([agentSelection, t.undefined]);
export type AgentSelectionOrUndefined = t.TypeOf<typeof agentSelectionOrUndefined>;

export const description = t.string;
export type Description = t.TypeOf<typeof description>;
export const descriptionOrUndefined = t.union([description, t.undefined]);
export type DescriptionOrUndefined = t.TypeOf<typeof descriptionOrUndefined>;

export const platform = t.string;
export type Platform = t.TypeOf<typeof platform>;
export const platformOrUndefined = t.union([platform, t.undefined]);
export type PlatformOrUndefined = t.TypeOf<typeof platformOrUndefined>;

export const query = t.string;
export type Query = t.TypeOf<typeof query>;
export const queryOrUndefined = t.union([query, t.undefined]);
export type QueryOrUndefined = t.TypeOf<typeof queryOrUndefined>;
