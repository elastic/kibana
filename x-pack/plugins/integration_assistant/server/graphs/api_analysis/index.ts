/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<<< HEAD:x-pack/plugins/integration_assistant/server/graphs/api_analysis/index.ts
export { getApiAnalysisGraph } from './graph';
========
import type { State } from '../../state';

export const isCelReviewStepReadyToComplete = ({ isGenerating, celInputResult }: State) =>
  isGenerating === false && celInputResult != null;
>>>>>>>> master:x-pack/platform/plugins/shared/integration_assistant/public/components/create_integration/create_integration_assistant/steps/review_cel_step/is_step_ready.ts
