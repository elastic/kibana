/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../shared/test_ids';

const RULE_PREVIEW_TEST_ID = `${PREFIX}RulePreviewPanel` as const;

export const RULE_PREVIEW_FOOTER_TEST_ID = `${RULE_PREVIEW_TEST_ID}Footer` as const;

export const RULE_PREVIEW_OPEN_RULE_FLYOUT_TEST_ID =
  `${RULE_PREVIEW_FOOTER_TEST_ID}OpenRuleFlyout` as const;
