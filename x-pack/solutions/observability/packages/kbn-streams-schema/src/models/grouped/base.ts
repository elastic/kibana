/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { StreamDefinitionBase } from '../base';

interface GroupedBase {
  description?: string;
  members: string[];
}

const groupedBaseSchema: z.Schema<GroupedBase> = z.object({
  description: z.optional(z.string()),
  members: z.array(NonEmptyString),
});

interface GroupedStreamDefinitionBase {
  grouped: GroupedBase;
}

const groupedStreamDefinitionBaseSchema: z.Schema<GroupedStreamDefinitionBase> = z.object({
  grouped: groupedBaseSchema,
});

type GroupedStreamDefinition = StreamDefinitionBase & GroupedStreamDefinitionBase;

const groupedStreamDefinitionSchema: z.Schema<GroupedStreamDefinition> = z.intersection(
  z.object({ name: NonEmptyString }),
  groupedStreamDefinitionBaseSchema
);

export {
  type GroupedBase,
  type GroupedStreamDefinitionBase,
  type GroupedStreamDefinition,
  groupedBaseSchema,
  groupedStreamDefinitionBaseSchema,
  groupedStreamDefinitionSchema,
};
