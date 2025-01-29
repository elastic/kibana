/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { StreamDefinitionBase } from '../base';

interface GroupBase {
  description?: string;
  members: string[];
}

const groupedBaseSchema: z.Schema<GroupBase> = z.object({
  description: z.optional(z.string()),
  members: z.array(NonEmptyString),
});

interface GroupStreamDefinitionBase {
  grouped: GroupBase;
}

const groupStreamDefinitionBaseSchema: z.Schema<GroupStreamDefinitionBase> = z.object({
  grouped: groupedBaseSchema,
});

type GroupStreamDefinition = StreamDefinitionBase & GroupStreamDefinitionBase;

const groupStreamDefinitionSchema: z.Schema<GroupStreamDefinition> = z.intersection(
  z.object({ name: NonEmptyString }),
  groupStreamDefinitionBaseSchema
);

export {
  type GroupBase,
  type GroupStreamDefinitionBase,
  type GroupStreamDefinition,
  groupedBaseSchema,
  groupStreamDefinitionBaseSchema,
  groupStreamDefinitionSchema,
};
