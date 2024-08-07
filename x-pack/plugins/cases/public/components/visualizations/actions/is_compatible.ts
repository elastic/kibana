/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { isLensApi } from '@kbn/lens-plugin/public';
import { apiPublishesTimeRange, hasBlockingError } from '@kbn/presentation-publishing';
import { canUseCases } from '../../../client/helpers/can_use_cases';
import { getCaseOwnerByAppId } from '../../../../common/utils/owner';

export function isCompatible(
  embeddable: unknown,
  currentAppId: string | undefined,
  core: CoreStart
) {
  if (!isLensApi(embeddable) || hasBlockingError(embeddable)) return false;
  if (!embeddable.getFullAttributes()) {
    return false;
  }
  const timeRange =
    embeddable.timeRange$?.value ??
    (embeddable.parentApi && apiPublishesTimeRange(embeddable.parentApi)
      ? embeddable.parentApi?.timeRange$?.value
      : undefined);
  if (!timeRange) {
    return false;
  }
  const owner = getCaseOwnerByAppId(currentAppId);
  const casePermissions = canUseCases(core.application.capabilities)(owner ? [owner] : undefined);
  return casePermissions.update && casePermissions.create;
}
