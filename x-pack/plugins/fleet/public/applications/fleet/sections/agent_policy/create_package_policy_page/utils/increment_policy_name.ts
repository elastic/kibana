/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '../../../../types';

export function incrementPolicyName(policies: AgentPolicy[]): string {
  const indices = policies
    .map((pol: AgentPolicy) => pol.name)
    .map((name) => {
      const match = name.match(/Agent policy (\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
  return `Agent policy ${Math.max(...indices, 0) + 1}`;
}
