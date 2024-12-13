/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import { EMPTY_RESOURCE_PLACEHOLDER } from '../../../../../../../../../common/siem_migrations/constants';
import { useUpsertResources } from '../../../../../../service/hooks/use_upsert_resources';
import type { RuleMigrationTaskStats } from '../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { UploadedLookups, AddUploadedLookups } from '../../lookups_data_input';
import * as i18n from './translations';
import { MissingLookupsList } from './missing_lookups_list';

export interface MissingLookupsListStepProps {
  status: EuiStepStatus;
  migrationStats: RuleMigrationTaskStats;
  missingLookups: string[];
  uploadedLookups: UploadedLookups;
  addUploadedLookups: AddUploadedLookups;
  onCopied: () => void;
}
export const useMissingLookupsListStep = ({
  status,
  migrationStats,
  missingLookups,
  uploadedLookups,
  addUploadedLookups,
  onCopied,
}: MissingLookupsListStepProps): EuiStepProps => {
  const { upsertResources, isLoading } = useUpsertResources(addUploadedLookups);

  const clearLookup = useCallback(
    (lookupName: string) => {
      upsertResources(migrationStats.id, [
        { type: 'list', name: lookupName, content: EMPTY_RESOURCE_PLACEHOLDER },
      ]);
    },
    [upsertResources, migrationStats]
  );

  return {
    title: i18n.LOOKUPS_DATA_INPUT_COPY_TITLE,
    status,
    children: (
      <MissingLookupsList
        onCopied={onCopied}
        missingLookups={missingLookups}
        uploadedLookups={uploadedLookups}
        clearLookup={clearLookup}
        isLoading={isLoading}
      />
    ),
  };
};
