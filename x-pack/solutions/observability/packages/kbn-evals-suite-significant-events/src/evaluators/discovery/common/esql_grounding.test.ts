/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import type { ConverseStep } from '@kbn/evals';
import { createExecuteEsqlGroundingEvaluator } from './esql_grounding';

describe('createExecuteEsqlGroundingEvaluator', () => {
  it('does not describe a missing result as a zero-row response', async () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: platformCoreTools.executeEsql,
        tool_call_id: 'failed-call',
        results: [{ type: 'error', data: { message: 'query failed' } }],
      },
      {
        type: 'tool_call',
        tool_id: platformCoreTools.executeEsql,
        tool_call_id: 'missing-result',
      },
    ];

    const result = await createExecuteEsqlGroundingEvaluator().evaluate({
      output: { steps },
    } as never);

    expect(result.explanation).toContain('1 execute_esql call(s) failed with a query error');
    expect(result.explanation).toContain('1 execute_esql call(s) returned no result');
    expect(result.explanation).not.toContain('returned zero rows');
  });
});
