/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ALERTS_INDEX, DEFAULT_PREVIEW_INDEX } from '../../../../../common/constants';

/*
The referenced alert _index in the flyout uses the `.internal.` such as
`.internal.alerts-security.alerts-spaceId` in the alert page flyout and
.internal.preview.alerts-security.alerts-spaceId` in the rule creation preview flyout
but we always want to use their respective aliase indices rather than accessing their backing .internal. indices.
*/
export const getAlertIndexAlias = (
  index: string,
  spaceId: string = 'default'
): string | undefined => {
  if (index.startsWith(`.internal${DEFAULT_ALERTS_INDEX}`)) {
    return `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
  } else if (index.startsWith(`.internal${DEFAULT_PREVIEW_INDEX}`)) {
    return `${DEFAULT_PREVIEW_INDEX}-${spaceId}`;
  }
};
