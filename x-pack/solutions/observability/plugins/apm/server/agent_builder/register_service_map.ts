/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { createServiceMapSkill } from './skills/service_map';
import { createServiceMapAttachmentType } from './attachments/service_map';

export const registerServiceMapAgentBuilder = ({
  agentBuilder,
}: {
  agentBuilder: AgentBuilderPluginSetup;
}) => {
  agentBuilder.skills.register(createServiceMapSkill());
  agentBuilder.attachments.registerType(
    createServiceMapAttachmentType() as Parameters<typeof agentBuilder.attachments.registerType>[0]
  );
};
