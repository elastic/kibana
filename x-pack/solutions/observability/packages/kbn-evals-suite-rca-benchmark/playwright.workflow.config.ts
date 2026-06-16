/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Playwright config for the investigation workflow eval spec.
 *
 * Uses singleProject: true because InvestigationWorkflowClient calls the workflow
 * API directly — the project connector is ignored and the workflow YAML hardcodes
 * the model. Running one project per connector would repeat identical work N times.
 *
 * Run:
 *   RCAEVAL_DATA_DIR=/home/beast/rcaeval-data \
 *   EVALUATION_CONNECTOR_ID=<judge-connector-id> \
 *   node scripts/evals run --suite rca-benchmark \
 *     --config playwright.workflow.config.ts \
 *     --spec evals/re2ob_investigation_workflow.spec.ts
 */
import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
  testIgnore: /re2ob_local\.spec\.ts|re2ob\.spec\.ts/,
  timeout: 45 * 60_000,
  singleProject: true,
});
