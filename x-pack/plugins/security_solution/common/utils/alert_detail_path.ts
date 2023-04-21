/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { ALERT_DETAILS_REDIRECT_PATH, APP_PATH } from '../constants';

export const buildAlertDetailPath = ({
  alertId,
  index,
  timestamp,
}: {
  alertId: string;
  index: string;
  timestamp: string;
}) => `${ALERT_DETAILS_REDIRECT_PATH}/${alertId}?index=${index}&timestamp=${timestamp}`;

export const getAlertDetailsUrl = ({
  alertId,
  index,
  timestamp,
  basePath,
  spaceId,
}: {
  alertId: string;
  index: string;
  timestamp: string;
  basePath?: string;
  spaceId?: string | null;
}) => {
  const alertDetailPath = buildAlertDetailPath({ alertId, index, timestamp });
  const alertDetailPathWithAppPath = `${APP_PATH}${alertDetailPath}`;
  return basePath
    ? addSpaceIdToPath(basePath, spaceId ?? undefined, alertDetailPathWithAppPath)
    : undefined;
};
