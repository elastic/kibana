/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Exception } from '@kbn/apm-types';
import type { FlattenedApmEvent } from '@kbn/apm-data-access-plugin/server/utils/utility_types';
import type { ProxiedApmEvent } from '@kbn/apm-data-access-plugin/server/utils/access_known_fields';
import { NOT_AVAILABLE_LABEL } from '../../../common/i18n';
import { ERROR_LOG_MESSAGE } from '../../../common/es_fields/apm';

export function getErrorName<T extends ProxiedApmEvent<Partial<FlattenedApmEvent>>>(
  event: T,
  exception: Exception
): string {
  return event[ERROR_LOG_MESSAGE] || exception.message || NOT_AVAILABLE_LABEL;
}
