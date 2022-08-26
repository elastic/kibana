/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { paramContainsSpace, FIELD_SPACE_WARNING_TEXT } from '@kbn/securitysolution-autocomplete';

interface UseValueWithSpaceWarningResult {
  showSpaceWarningIcon: boolean;
  warningText: string;
}

export const useValueWithSpaceWarning = (
  value: string | string[],
  tooltipIconText?: string
): UseValueWithSpaceWarningResult => {
  const showSpaceWarningIcon = Array.isArray(value)
    ? value.find((v) => paramContainsSpace(v))
    : paramContainsSpace(value);

  return {
    showSpaceWarningIcon: !!showSpaceWarningIcon,
    warningText: tooltipIconText || FIELD_SPACE_WARNING_TEXT,
  };
};
