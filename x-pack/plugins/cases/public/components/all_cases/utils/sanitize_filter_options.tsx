/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterOptions } from '../../../../common/ui/types';
import type { CaseStatuses, CaseSeverity } from '../../../../common/types/domain';

const notAll = (option: string) => option !== 'all';

/**
 * In earlier versions, the options 'status' and 'severity' could have a value of 'all'.
 * This function ensures such legacy values are removed from the URL parameters to maintain
 * backwards compatibility.
 */
export const removeLegacyValuesFromOptions = ({
  status: legacyStatus,
  severity: legacySeverity,
}: {
  status: Array<CaseStatuses | 'all'>;
  severity: Array<CaseSeverity | 'all'>;
}): { status: CaseStatuses[]; severity: CaseSeverity[] } => {
  return {
    status: legacyStatus.filter(notAll).filter(Boolean) as CaseStatuses[],
    severity: legacySeverity.filter(notAll).filter(Boolean) as CaseSeverity[],
  };
};

export const getStorableFilters = (
  filterOptions: Partial<FilterOptions>
): { status: CaseStatuses[] | undefined; severity: CaseSeverity[] | undefined } => {
  const { status, severity } = filterOptions;

  return { severity, status };
};
