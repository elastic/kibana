/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const id = t.string;
export type Id = t.TypeOf<typeof id>;
export const idOrUndefined = t.union([id, t.undefined]);
export type IdOrUndefined = t.TypeOf<typeof idOrUndefined>;

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

export const version = t.string;
export type Version = t.TypeOf<typeof version>;
export const versionOrUndefined = t.union([version, t.undefined]);
export type VersionOrUndefined = t.TypeOf<typeof versionOrUndefined>;

export const interval = t.string;
export type Interval = t.TypeOf<typeof interval>;
export const intervalOrUndefined = t.union([interval, t.undefined]);
export type IntervalOrUndefined = t.TypeOf<typeof intervalOrUndefined>;

export const savedQueryId = t.string;
export type SavedQueryId = t.TypeOf<typeof savedQueryId>;
export const savedQueryIdOrUndefined = t.union([savedQueryId, t.undefined]);
export type SavedQueryIdOrUndefined = t.TypeOf<typeof savedQueryIdOrUndefined>;

export const ecsMapping = t.record(
  t.string,
  t.partial({
    field: t.string,
    value: t.union([t.string, t.array(t.string)]),
  })
);
export type ECSMapping = t.TypeOf<typeof ecsMapping>;
export const ecsMappingOrUndefined = t.union([ecsMapping, t.undefined]);
export type ECSMappingOrUndefined = t.TypeOf<typeof ecsMappingOrUndefined>;
