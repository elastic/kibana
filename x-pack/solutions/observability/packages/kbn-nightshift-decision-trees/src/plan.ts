/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const MAX_TEXT_LENGTH = 10_000;
const MAX_MERMAID_LENGTH = 100_000;
const MAX_LIST_SIZE = 200;

/**
 * Structured investigation plan the reinforcement agent produces.
 *
 * This is the native counterpart of the pinned Deductive reference schema: the tree is keyed
 * by the symptom it diagnoses rather than by a monitor id, because the slug was never a
 * monitor identifier. The remaining fields match the reference so the same evaluators apply.
 */
export const decisionTreePlanSchema = z.object({
  symptom: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .describe(
      'Stable kebab-case symptom slug identifying this decision tree, 2-5 words using only letters, digits and hyphens. No environment, region, team or timestamp.'
    ),
  applicability: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .describe(
      'Describe when this plan should be applied. What types of alerts, symptoms, or scenarios indicate this plan is relevant?'
    ),
  category_identification: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .describe(
      'How can an engineer identify that an alert belongs to this category? What are the key signals or patterns to look for?'
    ),
  decision_tree_mermaid: z
    .string()
    .max(MAX_MERMAID_LENGTH)
    .describe(
      "Mermaid diagram of the decision tree. Must start directly with 'flowchart TD' — do NOT wrap in code fences."
    ),
  evidence_gatherer_metadata: z
    .array(z.string().max(MAX_TEXT_LENGTH))
    .max(MAX_LIST_SIZE)
    .describe(
      "For EACH evidence_gatherer node in the decision tree, provide a string in the format '<node_id>: <description>' where node_id matches the Mermaid diagram ID (e.g. E1, E2) and description is a natural-language summary of the toolset/skill used, what data it gathers, and from which data sources. Include key query entities such as metric names, fields, log indices, keywords, service names, namespaces, resources, and filters. Preserve the exact reusable query entities from the investigation/tool calls whenever they are available. Keep the corresponding Mermaid evidence-gatherer label concise. Example: 'E1: Elasticsearch - Query container.cpu.usage grouped by pod and namespace for the alert time window'"
    )
    .default([]),
  keywords: z
    .array(z.string().max(MAX_TEXT_LENGTH))
    .max(MAX_LIST_SIZE)
    .describe('A short list of keywords which can be used to search for this investigation plan.'),
});

export type DecisionTreePlan = z.infer<typeof decisionTreePlanSchema>;
