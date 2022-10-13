/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query } from '@elastic/eui';
import type { ExportRulesDetails } from '../../../../../common/detection_engine/schemas/response/export_rules_details_schema';
import type { BulkActionSummary } from '../../../rule_management/logic';

export const caseInsensitiveSort = (tags: string[]): string[] => {
  return tags.sort((a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase())); // Case insensitive
};

export const getSearchFilters = ({
  query,
  searchValue,
  filterOptions,
  defaultSearchTerm,
}: {
  query: Query | null;
  searchValue: string;
  filterOptions: Record<string, string | null>;
  defaultSearchTerm: string;
}): Record<string, string | null> => {
  const fieldClauses = query?.ast.getFieldClauses();

  if (fieldClauses != null && fieldClauses.length > 0) {
    const filtersReduced = fieldClauses.reduce<Record<string, string | null>>(
      (acc, { field, value }) => {
        acc[field] = `${value}`;

        return acc;
      },
      filterOptions
    );

    return filtersReduced;
  }

  return { [defaultSearchTerm]: searchValue };
};

/**
 * This function helps to parse NDJSON with exported rules
 * and retrieve the metadata of exported rules.
 *
 * @param blob a Blob received from an _export endpoint
 * @returns Export details
 */
export const getExportedRulesDetails = async (blob: Blob): Promise<ExportRulesDetails> => {
  const blobContent = await blob.text();
  // The Blob content is an NDJSON file, the last line of which contains export details.
  const exportDetailsJson = blobContent.split('\n').filter(Boolean).slice(-1)[0];
  const exportDetails = JSON.parse(exportDetailsJson);

  return exportDetails;
};

/**
 * This function helps to parse NDJSON with exported rules
 * and retrieve the object with counts of successfully exported/missing/total rules.
 *
 * @param blob a Blob received from an _export endpoint
 * @returns Object of exported rules counts
 */
export const getExportedRulesCounts = async (blob: Blob): Promise<BulkActionSummary> => {
  const details = await getExportedRulesDetails(blob);

  return {
    succeeded: details.exported_rules_count,
    failed: details.missing_rules_count,
    total: details.exported_rules_count + details.missing_rules_count,
  };
};
