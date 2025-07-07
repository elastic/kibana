/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import path from 'path';

export const AI_ASSISTANT_SNAPSHOT_REPO_PATH = path.resolve(
  REPO_ROOT,
  'x-pack/test/api_integration/deployment_agnostic/apis/observability/ai_assistant/knowledge_base/snapshots/'
);

export const LOCAL_PRODUCT_DOC_PATH = path.resolve(
  REPO_ROOT,
  'x-pack/test/api_integration/deployment_agnostic/apis/observability/ai_assistant/complete/product_docs'
);
