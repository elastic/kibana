/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { symptomFilePath } from '@kbn/nightshift-decision-trees';
import type { ReinforcementExample } from './types';

/**
 * Reduced rounds from the published Customer-0 smoke incident
 * (`customer0-eql-slo-burn-rate-2026-09-14` in elastic/nightshift-program).
 * They are not raw cluster transcripts. Set `NIGHTSHIFT_REINFORCEMENT_TRACES_FILE`
 * to replay an export instead.
 */
const VIEW_FILE = 'nightshift_sandbox_view_file';
const BASH = 'nightshift_sandbox_bash';

const markdown = (title: string, mermaid: string): string =>
  `# ${title}\n\n\`\`\`mermaid\n${mermaid.trim()}\n\`\`\`\n`;

const treePath = (treeId: string): string => `/workspace/${symptomFilePath(treeId)}`;

const round = (
  example: Omit<ReinforcementExample, 'input'> & {
    input: Omit<ReinforcementExample['input'], 'tool_calls' | 'tool_results'> & {
      bash: string;
    };
  }
): ReinforcementExample => {
  const { tree_id: treeId } = example.input.prior_tree;
  const viewId = `${example.metadata.case_id}-view`;
  const bashId = `${example.metadata.case_id}-bash`;
  const { bash, ...input } = example.input;
  return {
    metadata: example.metadata,
    input: {
      ...input,
      tool_calls: [
        { tool_id: VIEW_FILE, tool_call_id: viewId, params: { file_path: treePath(treeId) } },
        { tool_id: BASH, tool_call_id: bashId, params: { command: 'esql' } },
      ],
      tool_results: [
        {
          tool_id: VIEW_FILE,
          tool_call_id: viewId,
          results: [{ tool_result_id: `${viewId}-r`, type: 'other', data: { text: 'tree' } }],
        },
        {
          tool_id: BASH,
          tool_call_id: bashId,
          results: [
            {
              tool_result_id: `${bashId}-r`,
              type: 'other',
              data: { exit_code: 0, stdout: bash },
            },
          ],
        },
      ],
    },
  };
};

const EQL_TREE = `flowchart TD
    S1([EQL query success SLO burn]) --> E1[Read otel gateway and proxy errors]
    E1 --> D1{{Did a uiam pod stop serving?}}
    D1 -->|yes| E2[Pod restarted]
    D1 -->|yes| E3[Pod deleted]
    E2 --> X1((Availability recovered))
    E3 --> X1
    D1 -->|no| X2((Escalate))`;

const GATEWAY_TREE = `flowchart TD
    S1([Otel delivery gateway errors]) --> E1[Correlate with the uiam pod]
    E1 --> D1{{Errors stop after the pod is replaced?}}
    D1 -->|yes| X1((Upstream pod loss))
    D1 -->|no| X2((Gateway fault))`;

const PROXY_TREE = `flowchart TD
    S1([Elasticsearch proxy errors]) --> E1[Check proxy logs around the alert]
    E1 --> D1{{Errors limited to one pod?}}
    D1 -->|yes| X1((Single pod))
    D1 -->|no| X2((Wider proxy fault))`;

export const reinforcementExamples: ReinforcementExample[] = [
  round({
    metadata: {
      case_id: 'customer0-eql-slo-burn-rate-2026-09-14',
      source: 'customer0-smoke-reduced',
    },
    input: {
      question:
        'Debug the root cause of "SLO burn-rate/availability alert on EQL query success rate". ' +
        'Detected 2026-09-14 18:00 UTC. Environment: Production, Azure eastus2. ' +
        'Product: Elastic Cloud Serverless.',
      response: [
        'Conclusion: uiam-58fb87db87-26cfj in prd-azueus2-cp-app-1 was deleted.',
        'Kubernetes scheduled replacement uiam-58fb87db87-vd5fc, which served traffic normally.',
        'otel-delivery-gateway and Elasticsearch proxy errors stopped after the deletion.',
        '{"status":"confirmed","candidate":"uiam pod deleted and replaced"}',
      ].join('\n'),
      prior_tree: {
        tree_id: 'symptom:eql-slo-burn-rate',
        version: 1,
        markdown: markdown('EQL query success SLO burn', EQL_TREE),
      },
      bash:
        'uiam-58fb87db87-26cfj deleted at 18:00 UTC; replacement uiam-58fb87db87-vd5fc ready. ' +
        'EQL success recovered. Restart and deletion are the same pod-loss event.',
    },
  }),
  round({
    metadata: {
      case_id: 'customer0-otel-gateway-errors-2026-09-14',
      source: 'customer0-smoke-reduced',
    },
    input: {
      question:
        'The same 2026-09-14 18:00 UTC Azure eastus2 incident also raised otel-delivery-gateway errors. ' +
        'The EQL SLO tree already recorded the uiam pod deletion. Update the gateway tree.',
      response: [
        'Conclusion: gateway errors stopped once the deleted uiam pod was replaced.',
        '{"status":"confirmed","candidate":"upstream uiam pod loss"}',
      ].join('\n'),
      prior_tree: {
        tree_id: 'symptom:otel-gateway-errors',
        version: 2,
        markdown: markdown('Otel delivery gateway errors', GATEWAY_TREE),
      },
      bash: 'otel-delivery-gateway errors drop to zero after uiam-58fb87db87-vd5fc becomes ready. No gateway deploy.',
    },
  }),
  round({
    metadata: {
      case_id: 'customer0-es-proxy-errors-2026-09-14',
      source: 'customer0-smoke-reduced',
    },
    input: {
      question:
        'Elasticsearch proxy errors were logged during the 2026-09-14 18:00 UTC Azure eastus2 incident. ' +
        'Decide whether they are their own fault.',
      response: [
        'Proxy errors overlap the uiam pod deletion but also appear on other pods in the window.',
        '{"status":"rejected","candidate":"proxy errors limited to the deleted pod"}',
      ].join('\n'),
      prior_tree: {
        tree_id: 'symptom:es-proxy-errors',
        version: 1,
        markdown: markdown('Elasticsearch proxy errors', PROXY_TREE),
      },
      bash: 'Proxy errors occur on several pods between 17:50 and 18:10 UTC, not only uiam-58fb87db87-26cfj.',
    },
  }),
];
