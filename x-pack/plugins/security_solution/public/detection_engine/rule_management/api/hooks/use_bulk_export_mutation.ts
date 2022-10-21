/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { BulkExportProps, BulkExportResponse } from '../api';
import { bulkExportRules } from '../api';

export const useBulkExportMutation = (
  options?: UseMutationOptions<BulkExportResponse, Error, BulkExportProps>
) => {
  return useMutation<BulkExportResponse, Error, BulkExportProps>(
    (action: BulkExportProps) => bulkExportRules(action),
    options
  );
};
