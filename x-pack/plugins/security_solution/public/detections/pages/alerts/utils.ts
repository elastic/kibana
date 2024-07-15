/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { expandableFlyoutStateFromEventMeta } from '../../../flyout/document_details/shared/hooks/url/expandable_flyout_state_from_event_meta';

export interface ResolveFlyoutParamsConfig {
  index: string;
  alertId: string;
}

/**
 * Resolves url parameters for the flyout, serialized as
 * rison string. NOTE: if user is already redirected to this route with flyout parameters set,
 * we simply use them. It will be the case when users are coming here using a link obtained
 * with Share Button on the Expandable Flyout
 */
export const resolveFlyoutParams = (
  { index, alertId }: ResolveFlyoutParamsConfig,
  currentParamsString: string | null
) => {
  if (currentParamsString) {
    return currentParamsString;
  }

  return encode(
    expandableFlyoutStateFromEventMeta({ index, eventId: alertId, scopeId: 'alerts-page' })
  );
};
