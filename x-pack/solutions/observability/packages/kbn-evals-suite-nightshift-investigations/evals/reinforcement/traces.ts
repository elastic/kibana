/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { symptomFilePath } from '@kbn/nightshift-decision-trees';
import type { ReinforcementExample } from './types';

/**
 * Rounds from the published Customer-0 smoke incident
 * (`customer0-eql-slo-burn-rate-2026-09-14` in elastic/nightshift-program).
 * The question and conclusion are that label. The gateway and proxy rounds are the two
 * symptoms the label names. Each view_file result is the prior tree, and each sandbox
 * command is an ES|QL query whose rows restate the label. They are not a captured
 * cluster transcript. The first prior tree has two nodes for one pod-loss event, so
 * the reinforcement agent has a real merge to declare. The last round is a reduced negative
 * round, not the published label: it confirms no cause, so a causal path on it scores 0.
 * Set `NIGHTSHIFT_REINFORCEMENT_TRACES_FILE` to replay an export instead.
 */
const VIEW_FILE = 'nightshift_sandbox_view_file';
const BASH = 'nightshift_sandbox_bash';

const markdown = (title: string, mermaid: string): string =>
  `# ${title}\n\n\`\`\`mermaid\n${mermaid.trim()}\n\`\`\`\n`;

const treePath = (treeId: string): string => `/workspace/${symptomFilePath(treeId)}`;

interface ReplayedQuery {
  query: string;
  stdout: string;
}

const round = (
  example: Omit<ReinforcementExample, 'input'> & {
    input: Omit<ReinforcementExample['input'], 'tool_calls' | 'tool_results'> & {
      queries: ReplayedQuery[];
    };
  }
): ReinforcementExample => {
  const { tree_id: treeId, markdown: treeMarkdown } = example.input.prior_tree;
  const viewId = `${example.metadata.case_id}-view`;
  const bashId = (index: number): string => `${example.metadata.case_id}-bash-${index}`;
  const { queries, ...input } = example.input;
  return {
    metadata: example.metadata,
    input: {
      ...input,
      tool_calls: [
        { tool_id: VIEW_FILE, tool_call_id: viewId, params: { file_path: treePath(treeId) } },
        ...queries.map(({ query }, index) => ({
          tool_id: BASH,
          tool_call_id: bashId(index),
          params: { command: query },
        })),
      ],
      tool_results: [
        {
          tool_id: VIEW_FILE,
          tool_call_id: viewId,
          results: [{ tool_result_id: `${viewId}-r`, type: 'other', data: { text: treeMarkdown } }],
        },
        ...queries.map(({ stdout }, index) => ({
          tool_id: BASH,
          tool_call_id: bashId(index),
          results: [
            {
              tool_result_id: `${bashId(index)}-r`,
              type: 'other' as const,
              data: { exit_code: 0, stdout },
            },
          ],
        })),
      ],
    },
  };
};

/** Published label for `customer0-eql-slo-burn-rate-2026-09-14`. */
const PUBLISHED_CONCLUSION = [
  'The problematic pod uiam-58fb87db87-26cfj (in cluster prd-azueus2-cp-app-1, Azure East US 2) was deleted.',
  'Kubernetes scheduled a healthy replacement pod (uiam-58fb87db87-vd5fc), which began serving traffic normally.',
  'Errors in the otel-delivery-gateway and the Elasticsearch proxy logs stopped after the deletion.',
].join(' ');

const confirmed = (candidate: string): string =>
  `{"hypotheses":[{"candidate":"${candidate}","status":"confirmed"}]}`;

const unconfirmed = (rejected: string, inconclusive: string): string =>
  `{"hypotheses":[{"candidate":"${rejected}","status":"rejected"},{"candidate":"${inconclusive}","status":"inconclusive"}]}`;

const esqlQuery = (body: string): string =>
  `esql "FROM logs-* | WHERE @timestamp >= \\"2026-09-14T17:50:00.000Z\\" AND @timestamp < \\"2026-09-14T18:20:00.000Z\\" AND ${body} | LIMIT 20"`;

/** The uiam pod's lifecycle around the incident: the restart and the deletion are one event. */
const UIAM_POD_LIFECYCLE: ReplayedQuery = {
  query: esqlQuery(
    'k8s.pod.name LIKE \\"uiam-58fb87db87-*\\" | KEEP @timestamp, k8s.pod.name, event.action, message | SORT @timestamp'
  ),
  stdout: [
    '@timestamp                 k8s.pod.name           event.action  message',
    '2026-09-14T18:00:00.000Z   uiam-58fb87db87-26cfj  killing       Stopping container uiam for pod restart',
    '2026-09-14T18:00:00.000Z   uiam-58fb87db87-26cfj  deleted       Pod deleted; ReplicaSet uiam-58fb87db87 creates a replacement',
    '2026-09-14T18:01:00.000Z   uiam-58fb87db87-vd5fc  started       Replacement pod ready and serving traffic',
  ].join('\n'),
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
      source: 'customer0-smoke',
      // Not `require_merge` yet: the prompt doesn't ask for merges, so the round would miss every
      // time. The judge still scores whether the agent folds the duplicate pod-loss nodes.
    },
    input: {
      question: [
        'i want you to debug and identify the root cause of "SLO burn-rate/availability alert on EQL query success rate"',
        'Detected/Started/Acknowledged: 2026-09-14 18:00 UTC',
        'Environment: Production, Azure (azure.eastus2)',
        'Product impacted: Elastic Cloud Serverless',
      ].join('\n'),
      response: [
        `Conclusion: ${PUBLISHED_CONCLUSION}`,
        'Pod restarted and Pod deleted are the same pod-loss event.',
        confirmed('uiam pod deleted and replaced'),
      ].join('\n'),
      prior_tree: {
        tree_id: 'symptom:eql-slo-burn-rate',
        version: 1,
        markdown: markdown('EQL query success SLO burn', EQL_TREE),
      },
      queries: [UIAM_POD_LIFECYCLE],
    },
  }),
  round({
    metadata: {
      case_id: 'customer0-otel-gateway-errors-2026-09-14',
      source: 'customer0-smoke',
    },
    input: {
      question:
        'otel-delivery-gateway errors were logged during the 2026-09-14 18:00 UTC Azure eastus2 incident, ' +
        'alongside the EQL query success SLO burn.',
      response: [`Conclusion: ${PUBLISHED_CONCLUSION}`, confirmed('upstream uiam pod loss')].join(
        '\n'
      ),
      prior_tree: {
        tree_id: 'symptom:otel-gateway-errors',
        version: 2,
        markdown: markdown('Otel delivery gateway errors', GATEWAY_TREE),
      },
      queries: [
        {
          query: esqlQuery(
            'service.name == \\"otel-delivery-gateway\\" AND log.level == \\"error\\" | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 5 minutes), destination.address | SORT bucket'
          ),
          stdout: [
            'bucket                     destination.address    errors',
            '2026-09-14T17:50:00.000Z   uiam-58fb87db87-26cfj  212',
            '2026-09-14T17:55:00.000Z   uiam-58fb87db87-26cfj  348',
            '2026-09-14T18:00:00.000Z   uiam-58fb87db87-26cfj  41',
          ].join('\n'),
        },
        UIAM_POD_LIFECYCLE,
      ],
    },
  }),
  round({
    metadata: {
      case_id: 'customer0-es-proxy-errors-2026-09-14',
      source: 'customer0-smoke',
    },
    input: {
      question:
        'Elasticsearch proxy errors were logged during the 2026-09-14 18:00 UTC Azure eastus2 incident, ' +
        'alongside the EQL query success SLO burn.',
      response: [
        `Conclusion: ${PUBLISHED_CONCLUSION}`,
        confirmed('proxy errors stopped after the uiam pod deletion'),
      ].join('\n'),
      prior_tree: {
        tree_id: 'symptom:es-proxy-errors',
        version: 1,
        markdown: markdown('Elasticsearch proxy errors', PROXY_TREE),
      },
      queries: [
        {
          query: esqlQuery(
            'service.name == \\"elasticsearch-proxy\\" AND log.level == \\"error\\" | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 5 minutes), destination.address | SORT bucket'
          ),
          stdout: [
            'bucket                     destination.address    errors',
            '2026-09-14T17:50:00.000Z   uiam-58fb87db87-26cfj  87',
            '2026-09-14T17:55:00.000Z   uiam-58fb87db87-26cfj  131',
            '2026-09-14T18:00:00.000Z   uiam-58fb87db87-26cfj  19',
          ].join('\n'),
        },
        UIAM_POD_LIFECYCLE,
      ],
    },
  }),
  round({
    metadata: {
      case_id: 'customer0-es-proxy-unconfirmed-2026-09-14',
      source: 'customer0-smoke',
    },
    input: {
      question:
        'Elasticsearch proxy errors were logged during the 2026-09-14 18:00 UTC Azure eastus2 incident. ' +
        'Check whether they come from one proxy pod.',
      response: [
        'Conclusion: No cause was confirmed in this round.',
        'The proxy errors are spread over several elasticsearch-proxy pods, so a single bad pod is ruled out,',
        'but the logs in this window do not show what the pods have in common.',
        unconfirmed('proxy errors limited to one pod', 'wider proxy fault'),
      ].join('\n'),
      prior_tree: {
        tree_id: 'symptom:es-proxy-errors',
        version: 1,
        markdown: markdown('Elasticsearch proxy errors', PROXY_TREE),
      },
      queries: [
        {
          query: esqlQuery(
            'service.name == \\"elasticsearch-proxy\\" | STATS errors = COUNT(*) BY k8s.pod.name | SORT errors DESC'
          ),
          stdout: [
            'k8s.pod.name                         errors',
            'elasticsearch-proxy-7d9c5b6f4-2xkqp  14',
            'elasticsearch-proxy-7d9c5b6f4-8mzvt  12',
            'elasticsearch-proxy-7d9c5b6f4-q4wjn  11',
          ].join('\n'),
        },
      ],
    },
  }),
];
