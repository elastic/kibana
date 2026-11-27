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
 * the reinforcement agent must declare that merge. The rounds after the published label are
 * reduced rounds: a first round that confirms no cause, a follow-up whose causal check confirms
 * the human's cause, a follow-up whose check does not, and a first round that opens no tree and
 * confirms no cause, so the agent creates a tree without a causal path.
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
  const viewId = `${example.metadata.case_id}-view`;
  const bashId = (index: number): string => `${example.metadata.case_id}-bash-${index}`;
  const { queries, ...input } = example.input;
  // A round without a prior tree opens none, so the agent creates one.
  const prior = input.prior_tree;
  return {
    metadata: example.metadata,
    input: {
      ...input,
      tool_calls: [
        ...(prior
          ? [
              {
                tool_id: VIEW_FILE,
                tool_call_id: viewId,
                params: { file_path: treePath(prior.tree_id) },
              },
            ]
          : []),
        ...queries.map(({ query }, index) => ({
          tool_id: BASH,
          tool_call_id: bashId(index),
          params: { command: query },
        })),
      ],
      tool_results: [
        ...(prior
          ? [
              {
                tool_id: VIEW_FILE,
                tool_call_id: viewId,
                results: [
                  { tool_result_id: `${viewId}-r`, type: 'other', data: { text: prior.markdown } },
                ],
              },
            ]
          : []),
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

const esqlQuery = (body: string, index = 'logs-*'): string =>
  `esql "FROM ${index} | WHERE @timestamp >= \\"2026-09-14T17:50:00.000Z\\" AND @timestamp < \\"2026-09-14T18:20:00.000Z\\" AND ${body} | LIMIT 20"`;

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

/** A later gateway tree with branches the follow-up round does not walk. */
const GATEWAY_FOLLOWUP_TREE = `flowchart TD
    S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]
    E1 --> D1{{Errors point at one upstream?}}
    D1 -->|yes| E2[Correlate with the upstream pod]
    D1 -->|no| E3[Check gateway resource usage]
    E2 --> D2{{Errors stop after the pod is replaced?}}
    D2 -->|yes| X1((Upstream pod loss))
    D2 -->|no| X2((Upstream fault persists))
    E3 --> X3((Gateway resource exhaustion))`;

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
      // The prompt asks the agent to fold duplicate nodes the investigation shows are one event, so
      // an empty `merged_nodes` for the restarted and deleted pod nodes scores 0.
      require_merge: true,
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
  round({
    metadata: {
      case_id: 'customer0-otel-gateway-followup-confirmed-2026-09-14',
      source: 'customer0-smoke',
    },
    input: {
      question:
        'Thanks. For the record, we deleted uiam-58fb87db87-26cfj at 18:00 and the otel-delivery-gateway ' +
        'errors stopped as soon as the replacement pod came up. Can you confirm that pod was the cause?',
      response: [
        'Confirmed: losing uiam-58fb87db87-26cfj caused the otel-delivery-gateway errors.',
        'Gateway resource exhaustion is ruled out: no otel-delivery-gateway pod went above 34% of its',
        'CPU limit or 52% of its memory limit.',
        'Every gateway error in the window targeted that pod, climbing to 78 a minute by 17:59.',
        'The last 41 landed in the 18:00 minute, and none were logged after the replacement',
        'uiam-58fb87db87-vd5fc started serving at 18:01.',
        confirmed('upstream uiam pod loss'),
      ].join('\n'),
      follow_up: { causal_confirmed: true },
      prior_tree: {
        tree_id: 'symptom:otel-gateway-errors',
        version: 3,
        markdown: markdown('Otel delivery gateway errors', GATEWAY_FOLLOWUP_TREE),
      },
      queries: [
        // The D1 -->|no| E3 branch: the gateway's own resource usage, which was normal.
        {
          query: esqlQuery(
            'k8s.deployment.name == \\"otel-delivery-gateway\\" | STATS max_cpu_utilization = MAX(k8s.pod.cpu_limit_utilization), max_memory_utilization = MAX(k8s.pod.memory_limit_utilization) BY k8s.pod.name | SORT max_cpu_utilization DESC',
            'metrics-*'
          ),
          stdout: [
            'k8s.pod.name                           max_cpu_utilization  max_memory_utilization',
            'otel-delivery-gateway-6c8f9d7b5-h2kdx  0.34                 0.52',
            'otel-delivery-gateway-6c8f9d7b5-t7mzq  0.31                 0.49',
            'otel-delivery-gateway-6c8f9d7b5-x9vbn  0.29                 0.47',
          ].join('\n'),
        },
        {
          query: esqlQuery(
            'service.name == \\"otel-delivery-gateway\\" AND log.level == \\"error\\" | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute), destination.address | SORT bucket'
          ),
          stdout: [
            'bucket                     destination.address    errors',
            '2026-09-14T17:50:00.000Z   uiam-58fb87db87-26cfj  38',
            '2026-09-14T17:51:00.000Z   uiam-58fb87db87-26cfj  40',
            '2026-09-14T17:52:00.000Z   uiam-58fb87db87-26cfj  43',
            '2026-09-14T17:53:00.000Z   uiam-58fb87db87-26cfj  44',
            '2026-09-14T17:54:00.000Z   uiam-58fb87db87-26cfj  47',
            '2026-09-14T17:55:00.000Z   uiam-58fb87db87-26cfj  61',
            '2026-09-14T17:56:00.000Z   uiam-58fb87db87-26cfj  66',
            '2026-09-14T17:57:00.000Z   uiam-58fb87db87-26cfj  70',
            '2026-09-14T17:58:00.000Z   uiam-58fb87db87-26cfj  73',
            '2026-09-14T17:59:00.000Z   uiam-58fb87db87-26cfj  78',
            '2026-09-14T18:00:00.000Z   uiam-58fb87db87-26cfj  41',
          ].join('\n'),
        },
        UIAM_POD_LIFECYCLE,
      ],
    },
  }),
  round({
    metadata: {
      case_id: 'customer0-es-proxy-followup-unconfirmed-2026-09-14',
      source: 'customer0-smoke',
    },
    input: {
      question:
        'We also rolled out a new elasticsearch-proxy config around then. ' +
        'Could that rollout be what caused the proxy errors?',
      response: [
        'Conclusion: The config rollout did not cause the proxy errors, and no cause was confirmed in this round.',
        'The proxy pods loaded config generation 418 from 18:12, after the errors had already ended in the',
        '18:00 bucket. They ended when the uiam pod was replaced, but the proxy logs in this window do not',
        'record which upstream each request failed on, so that link is not shown either.',
        unconfirmed('proxy config rollout', 'uiam pod loss behind the proxy errors'),
      ].join('\n'),
      follow_up: { causal_confirmed: false },
      prior_tree: {
        tree_id: 'symptom:es-proxy-errors',
        version: 2,
        markdown: markdown('Elasticsearch proxy errors', PROXY_TREE),
      },
      queries: [
        {
          query: esqlQuery(
            'service.name == \\"elasticsearch-proxy\\" AND log.level == \\"error\\" | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 5 minutes) | SORT bucket'
          ),
          stdout: [
            'bucket                     errors',
            '2026-09-14T17:50:00.000Z   87',
            '2026-09-14T17:55:00.000Z   131',
            '2026-09-14T18:00:00.000Z   19',
          ].join('\n'),
        },
        {
          query: esqlQuery(
            'service.name == \\"elasticsearch-proxy\\" AND event.action == \\"config_reloaded\\" | KEEP @timestamp, k8s.pod.name, event.action, message | SORT @timestamp'
          ),
          stdout: [
            '@timestamp                 k8s.pod.name                         event.action     message',
            '2026-09-14T18:12:04.000Z   elasticsearch-proxy-7d9c5b6f4-2xkqp  config_reloaded  Loaded proxy config generation 418',
            '2026-09-14T18:12:05.000Z   elasticsearch-proxy-7d9c5b6f4-8mzvt  config_reloaded  Loaded proxy config generation 418',
            '2026-09-14T18:12:07.000Z   elasticsearch-proxy-7d9c5b6f4-q4wjn  config_reloaded  Loaded proxy config generation 418',
          ].join('\n'),
        },
      ],
    },
  }),
  round({
    metadata: {
      case_id: 'customer0-uiam-pod-loss-initial-2026-09-14',
      source: 'customer0-smoke',
    },
    input: {
      question:
        'uiam returned 503s to authentication requests during the 2026-09-14 18:00 UTC Azure eastus2 incident. ' +
        'Find out why.',
      response: [
        'Conclusion: No cause was confirmed in this round.',
        'Every 503 came from uiam-58fb87db87-26cfj, and they stopped once the pod was deleted at 18:00',
        'and uiam-58fb87db87-vd5fc took over at 18:01. The replacement runs the same ReplicaSet, so a',
        'rollout is ruled out, but the logs in this window do not show why that pod started failing.',
        unconfirmed('uiam deployment rollout', 'fault inside pod uiam-58fb87db87-26cfj'),
      ].join('\n'),
      queries: [
        {
          query: esqlQuery(
            'service.name == \\"uiam\\" AND http.response.status_code == 503 | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 5 minutes), k8s.pod.name | SORT bucket'
          ),
          stdout: [
            'bucket                     k8s.pod.name           errors',
            '2026-09-14T17:50:00.000Z   uiam-58fb87db87-26cfj  299',
            '2026-09-14T17:55:00.000Z   uiam-58fb87db87-26cfj  479',
            '2026-09-14T18:00:00.000Z   uiam-58fb87db87-26cfj  60',
          ].join('\n'),
        },
        UIAM_POD_LIFECYCLE,
      ],
    },
  }),
];
