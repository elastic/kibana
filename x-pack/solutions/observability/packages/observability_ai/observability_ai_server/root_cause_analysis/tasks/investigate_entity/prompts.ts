/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatEntity } from '../../util/format_entity';
import { toBlockquote } from '../../util/to_blockquote';

export const getInvestigateEntityTaskPrompt = ({
  entity,
  contextForEntityInvestigation,
}: {
  entity: Record<string, string>;
  contextForEntityInvestigation: string;
}) => `## Entity-Based Investigation: Task Guide

In the investigation process, you are currently investigating the entity
${formatEntity(entity)}. The context given for this investigation is:

${toBlockquote(contextForEntityInvestigation)}`;
