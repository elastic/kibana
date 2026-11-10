/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceSchemaType } from '@kbn/apm-types';
import type { ApmIndicesSource } from '../../../hooks/use_apm_indices';

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
   * When parent filters changed and this transaction is no longer in the
   * filtered set, keep showing the previous filter snapshot and surface a banner.
   */
  isFiltersStale?: boolean;
  /**
   * True while parent filters changed and the transactions list has not yet settled —
   * the child still shows the last confirmed snapshot.
   */
  isFiltersPending?: boolean;
  /** Bumped by the parent refresh control so nested charts and fetchers reload. */
  refreshToken?: number;
  /**
   * When the surrounding UI is computed from raw documents (e.g. Discover),
   * RED charts stay ES|QL so they agree with that UI.
   */
  preferDocumentBasedCharts?: boolean;
  schema?: ServiceSchemaType;
  /**
   * When set, the parent owns APM indices, including while they are still loading.
   * Omit so this flyout fetches them — standalone hosts such as Discover.
   */
  indicesSource?: ApmIndicesSource;
  /**
   * Active alerts for this transaction, typically from the parent transactions table.
   * When absent or 0, the header hides the alerts badge.
   */
  alertsCount?: number;
}
