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
// answers a refused request it inspected with a `sandbox_egress_denied` body. github.com is the only
// host whose rules are checked per request, so a bare 403 counts only when it is github.com's: a
// 403 from any other host (a connector's cluster) is that service's own answer. git drops the body
// and prints the status with the URL. This is a best-effort eval signal, not a shell parser.
const EGRESS_REFUSED = /CONNECT tunnel failed, response 403|sandbox_egress_denied/;
const GIT_HTTP_403 = /unable to access '([^']*)': The requested URL returned error: 403/g;
// `curl -f` drops the body too and doesn't name the URL, so the command must request github.com.
const CURL_HTTP_403 = /curl: \(22\) The requested URL returned error: 403/;
// A shell word (quotes included, so a request body that mentions github.com stays one word) or an
// operator that ends a command, with or without spaces around it. Redirections like `2>&1` stay words.
const SHELL_TOKEN = /(?:'[^']*'|"(?:\\.|[^"\\])*"|[<>]&|&>|[^\s'"&|;()])+|&&|\|\||[\n;|&()]/g;
const SHELL_OPERATORS = new Set(['&&', '||', '\n', ';', '|', '&', '(', ')']);

const unquote = (word: string): string => word.replace(/^(['"])(.*)\1$/s, '$2');

const isGitHubUrl = (text: string): boolean => {
  try {
    return new URL(text).hostname === 'github.com';
  } catch {
    return false;
  }
};

/** The words of each command in a shell line, split at `&&`, `||`, `;`, `|`, `&` and newlines. */
const splitCommands = (line: string): string[][] =>
  (line.replace(/\\\n/g, '').match(SHELL_TOKEN) ?? []).reduce<string[][]>(
    (commands, token) => {
      if (SHELL_OPERATORS.has(token)) commands.push([]);
      else commands[commands.length - 1].push(unquote(token));
      return commands;
    },
    [[]]
  );

/** Whether a sandbox command runs curl with a github.com URL as one of curl's arguments. */
const curlRequestsGitHub = (line: string): boolean =>
  splitCommands(line).some((words) => words.includes('curl') && words.some(isGitHubUrl));

const gitRefusedByGitHub = (output: string): boolean =>
  [...output.matchAll(GIT_HTTP_403)].some(([, url]) => isGitHubUrl(url));

/** Sandbox commands whose output shows the egress firewall refused a connection or a request. */
export const countSandboxEgressDenials = (
  rounds: Array<Pick<ConversationRound, 'steps'>>
): number =>
  rounds
    .flatMap(({ steps }) => steps.filter(isToolCallStep))
    .filter(({ tool_id: toolId, params, results }) => {
      if (toolId !== 'nightshift_sandbox_bash') return false;
      const output = JSON.stringify(results.map(({ data }) => data));
      const { command } = params;
      return (
        EGRESS_REFUSED.test(output) ||
        gitRefusedByGitHub(output) ||
        (CURL_HTTP_403.test(output) && typeof command === 'string' && curlRequestsGitHub(command))
      );
    }).length;
