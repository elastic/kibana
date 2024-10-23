/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyZodError } from '@kbn/zod-helpers';
import { ImportTimelineResult } from '../../../../../common/api/timeline';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../types';
import { installPrepackagedTimelines } from '../../../timeline/routes/prepackaged_timelines/install_prepackaged_timelines';

export const performTimelinesInstallation = async (
  securitySolutionContext: SecuritySolutionApiRequestHandlerContext
) => {
  const timeline = await installPrepackagedTimelines(
    securitySolutionContext.getConfig()?.maxTimelineImportExportSize,
    securitySolutionContext.getFrameworkRequest(),
    true
  );
  const parsed = ImportTimelineResult.safeParse(timeline);

  return {
    result: parsed.data,
    error: parsed.error && stringifyZodError(parsed.error),
  };
};
