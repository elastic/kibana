/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import setupManagedOtlpDescription from './description.text';
import setupManagedOtlpContent from './skill.md.text';

export const createSetupManagedOtlpSkill = () =>
  defineSkillType({
    id: 'observability.setup-managed-otlp',
    name: 'setup-managed-otlp',
    basePath: 'skills/observability',
    description: setupManagedOtlpDescription,
    content: setupManagedOtlpContent,
  });
