/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOT_AVAILABLE_LABEL } from '../../../common/i18n';
import { Maybe } from '../../../typings/common';
import { APMError } from '../../../typings/es_schemas/ui/apm_error';

export function getErrorName({
  error,
}: {
  error: Maybe<Pick<APMError['error'], 'exception'>> & { log?: { message?: string } };
}): string {
  return error?.log?.message || error?.exception?.[0]?.message || NOT_AVAILABLE_LABEL;
}
