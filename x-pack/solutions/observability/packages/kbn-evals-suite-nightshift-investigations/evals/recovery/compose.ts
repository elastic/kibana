/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { buildAlertRecoveredFollowUpMessage } from '@kbn/nightshift-investigations-plugin/server/client/build_investigation_message';
import type { InvestigationExample } from '../investigation/types';

const recoveryAlertSchema = lazySchema(() =>
  z.object({
    alertUuid: z.string().min(1).max(500),
    alertId: z.string().min(1).max(500),
    alertStart: z.string().max(100).optional(),
    recoveredAt: z.string().max(100).optional(),
    ruleId: z.string().max(500).optional(),
    ruleName: z.string().max(500).optional(),
    ruleTypeId: z.string().max(500).optional(),
    ruleTags: z.array(z.string().max(500)).max(50).optional(),
  })
);

const priorStepSchema = lazySchema(() =>
  z.object({
    tool_id: z.string().min(1).max(200),
    params: z.record(z.string(), z.json()),
    result: z.string().max(10_000),
    note: z.string().max(1_000).optional(),
  })
);

/**
 * What a recovery example carries besides the round-1 request: that round's answer, the alert and,
 * when the dataset has them, the round's tool calls with bounded results (`prior_steps`).
 */
export const recoveryInputSchema = lazySchema(() =>
  z.object({
    prior_response: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
    prior_steps: z.array(priorStepSchema).max(100).optional(),
    alert: recoveryAlertSchema,
  })
);

/**
 * The recovery round's prompt, composed when the run starts so it always carries the recovery
 * message the branch under test builds. It is the whole `message`, so it still opens with the
 * recovery prefix and stays inside the start route's message limit.
 */
export const composeRecoveryQuestion = ({ input }: InvestigationExample): string =>
  buildAlertRecoveredFollowUpMessage(recoveryInputSchema.parse(input).alert);

// Derived from a schema, not written as an object type: the start route's `context` must be JSON,
// and an interface would not be assignable to it.
const earlierRoundContextSchema = lazySchema(() =>
  z.object({
    earlier_round: z.object({
      request: z.string(),
      steps: z
        .array(
          z.object({
            step: z.number(),
            tool: z.string(),
            arguments: priorStepSchema.shape.params,
            result: z.string(),
            note: z.string().optional(),
          })
        )
        .optional(),
      your_answer: z.string(),
    }),
  })
);

type EarlierRoundContext = z.infer<typeof earlierRoundContextSchema>;

/**
 * The investigation's earlier round, which the start route's open `context` carries because the
 * round does not fit beside the recovery prompt in a 10,000-character message: its request, the
 * tool calls it made with their results when the dataset has them, and its answer.
 */
export const composeEarlierRoundContext = ({
  input,
}: InvestigationExample): EarlierRoundContext => {
  const { prior_response: priorResponse, prior_steps: priorSteps } =
    recoveryInputSchema.parse(input);
  return {
    earlier_round: {
      request: input.question,
      ...(priorSteps
        ? {
            steps: priorSteps.map(({ tool_id: tool, params, result, note }, index) => ({
              step: index + 1,
              tool,
              arguments: params,
              result,
              ...(note ? { note } : {}),
            })),
          }
        : {}),
      your_answer: priorResponse,
    },
  };
};

/** The example with its question replaced by the recovery prompt and the earlier round as context. */
export const prepareRecoveryExample = (example: InvestigationExample): InvestigationExample => ({
  ...example,
  input: {
    ...example.input,
    question: composeRecoveryQuestion(example),
    context: composeEarlierRoundContext(example),
  },
});
