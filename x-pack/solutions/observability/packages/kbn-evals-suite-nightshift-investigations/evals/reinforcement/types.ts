/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** One edge the reinforcement agent names in a traversal. */
export interface EdgeRef {
  source_node_id?: string;
  target_node_id?: string;
  condition?: string;
}

/** Nodes the agent says it collapsed, so their counts move onto `into`. */
export interface NodeMerge {
  from?: string[];
  into?: string;
}

/** One edited tree inside a `nightshift_submit_optimizer_result` call. */
export interface SymptomTreeSubmission {
  tree_id?: string;
  file_path?: string;
  merged_nodes?: NodeMerge[];
}

/** One traversal inside a submit call. */
export interface TraversalSubmission {
  tree_id?: string;
  visited_path?: EdgeRef[];
  causal_path?: EdgeRef[];
}

/** Arguments of one submit call. Extra fields are ignored by the grader. */
export interface SubmitArguments {
  symptom_trees?: SymptomTreeSubmission[];
  traversals?: TraversalSubmission[];
  summary?: string;
}

/** A tool call from the investigator round that the reinforcement agent replays. */
export interface ReplayToolCall {
  tool_id: string;
  tool_call_id: string;
  params: Record<string, unknown>;
}

/** The matching tool result, keyed by `tool_call_id`. */
export interface ReplayToolResult {
  tool_id: string;
  tool_call_id: string;
  results: unknown[];
}

/**
 * One Customer-0 investigation round replayed through the reinforcement agent.
 * `prior_tree` is the tree already stored when the round starts.
 */
export interface ReinforcementExample {
  input: {
    question: string;
    response: string;
    prior_tree: {
      tree_id: string;
      /** Head version. Greater than 1 selects the follow-up reinforcement script. */
      version: number;
      markdown: string;
    };
    tool_calls: ReplayToolCall[];
    tool_results: ReplayToolResult[];
  };
  metadata: {
    case_id: string;
    /** Where the round came from, so a reduced fixture is not mistaken for a raw export. */
    source: string;
  };
}

/** What the task records for the graders. */
export interface ReinforcementTaskOutput {
  case_id: string;
  execution_id?: string;
  workflow_status?: string;
  execution_error?: string;
  /** Submit calls, in order. Empty when the agent never submitted. */
  submissions: SubmitArguments[];
  /** Mermaid of the tree after the run, or the prior tree when the run did not replace it. */
  submitted_mermaid?: string;
  prior_mermaid: string;
  tree_id: string;
}
