/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isToolCallStep } from '@kbn/agent-builder-common';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { InvestigationUsage } from './types';

/** Sums model usage and time-to-last-token over every round, so multi-round runs aren't undercounted. */
export const extractUsage = (
  rounds: Array<Pick<ConversationRound, 'model_usage' | 'time_to_last_token'>>
): InvestigationUsage =>
  rounds.reduce<InvestigationUsage>(
    (total, { model_usage: usage, time_to_last_token: latencyMs }) => ({
      input_tokens: total.input_tokens + (usage?.input_tokens ?? 0),
      cached_input_tokens: total.cached_input_tokens + (usage?.cached_input_tokens ?? 0),
      output_tokens: total.output_tokens + (usage?.output_tokens ?? 0),
      llm_calls: total.llm_calls + (usage?.llm_calls ?? 0),
      latency_ms: total.latency_ms + (latencyMs ?? 0),
    }),
    { input_tokens: 0, cached_input_tokens: 0, output_tokens: 0, llm_calls: 0, latency_ms: 0 }
  );

/** Every tool call the investigation made, counted before the trajectory is bounded. */
export const countToolCalls = (rounds: Array<Pick<ConversationRound, 'steps'>>): number =>
  rounds.reduce((total, { steps }) => total + steps.filter(isToolCallStep).length, 0);

// The sandbox reaches the internet only through credproxy. It refuses an HTTPS tunnel to a host
// outside the space's egress rules (`CONNECT tunnel failed, response 403` from git and curl), and
// answers a refused request it inspected with a `sandbox_egress_denied` body. git drops that body
// and prints only the status, naming the URL.
const EGRESS_DENIED =
  /CONNECT tunnel failed, response 403|sandbox_egress_denied|fatal: unable to access '[^']*': The requested URL returned error: 403/;
// `curl -f` drops the body too and doesn't name the URL. github.com is the only host whose rules
// are checked per request, so a 403 elsewhere (a connector's cluster) is the service's own answer.
const HTTP_403 = /The requested URL returned error: 403/;
const GITHUB = /github\.com/;

/** Sandbox commands whose output shows the egress firewall refused a connection or a request. */
export const countSandboxEgressDenials = (
  rounds: Array<Pick<ConversationRound, 'steps'>>
): number =>
  rounds
    .flatMap(({ steps }) => steps.filter(isToolCallStep))
    .filter(({ tool_id: toolId, params, results }) => {
      if (toolId !== 'nightshift_sandbox_bash') return false;
      const output = JSON.stringify(results.map(({ data }) => data));
      return (
        EGRESS_DENIED.test(output) || (HTTP_403.test(output) && GITHUB.test(JSON.stringify(params)))
      );
    }).length;
