/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Node, NodeType } from '../../../../common/connections';
import { AgentIcon } from '../agent_icon';
import { SpanIcon } from '../span_icon';

export function NodeIcon({ node }: { node: Node }) {
  return node.type === NodeType.service ? (
    <AgentIcon agentName={node.agentName} />
  ) : (
    <SpanIcon type={node.spanType} subType={node.spanSubtype} />
  );
}
