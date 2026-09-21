/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMIndices } from '@kbn/apm-sources-access-plugin/common/config_schema';
import type { ServiceSchemaType } from '@kbn/apm-types';

export interface TransactionDetailFlyoutFilters {
  serviceName: string;
  transactionName: string;
  transactionType: string;
  environment: string;
  rangeFrom: string;
  rangeTo: string;
  start: string;
  end: string;
}

export interface TransactionDetailFlyoutProps {
  filters: TransactionDetailFlyoutFilters;
  isOpen?: boolean;
  onClose: () => void;
  historyKey?: symbol;
  /**
   * When the host’s filters changed and this transaction is no longer in the
   * filtered set, keep showing the previous filter snapshot and surface a banner.
   */
  isFiltersStale?: boolean;
  /**
   * True while parent filters changed and the transactions list has not yet settled —
   * the child still shows the last confirmed snapshot.
   */
  isFiltersPending?: boolean;
  /** Bumped by the host refresh control so nested charts and fetchers reload. */
  refreshToken?: number;
  /**
   * Set by hosts whose surrounding UI is computed from raw documents (Discover):
   * RED charts then stay ES|QL so they agree with the host.
   */
  preferDocumentBasedCharts?: boolean;
  schema?: ServiceSchemaType;
  indices?: APMIndices | null;
}
