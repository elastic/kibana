/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Trained models that are allowed to exist on a freshly started serverless project.
 *
 * Do NOT add to this list to make a test pass. Serverless (ES3) must never start ML nodes on
 * startup: an ML node does not scale down for 24 hours, so every accidental start bills all
 * projects for a day of ML consumption. Pre-warming models does not help either, and EIS makes
 * ML nodes largely obsolete. See https://github.com/elastic/kibana-team/issues/4111
 *
 * Changes to this file require review from @elastic/search-ml-ux (see CODEOWNERS).
 */
export const EXPECTED_STARTUP_TRAINED_MODEL_IDS: readonly string[] = ['lang_ident_model_1'];
