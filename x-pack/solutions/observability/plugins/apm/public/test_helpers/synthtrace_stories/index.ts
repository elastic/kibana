/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared synthtrace scenario + selectors for APM Storybook stories.
 *
 * Pattern: pick a scenario (in-memory ApmFields[]), then run it through
 * component-specific selectors to get the exact shape each component expects.
 * Every story pulling from the same scenario shows consistent services,
 * latencies, and topology across the whole Storybook.
 *
 * @example
 * import { opbeansScenario, toServiceMapResponse } from '../../test_helpers/synthtrace_stories';
 * import { transformToReactFlow } from '../../common/service_map/transform_to_react_flow';
 *
 * const { nodes, edges } = transformToReactFlow(toServiceMapResponse(opbeansScenario()));
 */

export { opbeansScenario, SCENARIO_START, SCENARIO_END } from './scenarios/opbeans';
export { toServiceMapResponse } from './selectors/service_map';
export { toLatencyChartResponse } from './selectors/latency_chart';
