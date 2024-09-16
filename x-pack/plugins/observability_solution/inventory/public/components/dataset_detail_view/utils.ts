/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function planToConsoleOutput(plan: any) {
  return plan
    .map(
      (step: { title: any; method: any; path: any; body: any }) => `# ${step.title}
${step.method} ${step.path}
${step.body ? JSON.stringify(step.body, null, 2) : ''}`
    )
    .join('\n\n');
}
