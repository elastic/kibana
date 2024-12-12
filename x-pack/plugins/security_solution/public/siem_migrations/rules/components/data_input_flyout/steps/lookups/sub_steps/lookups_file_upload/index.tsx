/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import { ResourceIdentifier } from '../../../../../../../../../common/siem_migrations/rules/resources';
import { useUpsertResources } from '../../../../../../service/hooks/use_upsert_resources';
import type {
  RuleMigrationResourceData,
  RuleMigrationTaskStats,
} from '../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { OnResourcesCreated } from '../../../../types';
import { LookupsFileUpload } from './lookups_file_upload';
import * as i18n from './translations';

export interface RulesFileUploadStepProps {
  status: EuiStepStatus;
  migrationStats: RuleMigrationTaskStats;
  missingLookups: string[];
  addUploadedLookups: (lookups: string[]) => void;
  onLookupsCreated: OnResourcesCreated;
}
export const useLookupsFileUploadStep = ({
  status,
  migrationStats,
  missingLookups,
  addUploadedLookups,
  onLookupsCreated,
}: RulesFileUploadStepProps): EuiStepProps => {
  const { upsertResources, isLoading, error } = useUpsertResources(onLookupsCreated);

  const upsertMigrationResources = useCallback(
    (lookupsFromFile: RuleMigrationResourceData[]) => {
      const lookupsIndexed: Record<string, RuleMigrationResourceData> = Object.fromEntries(
        lookupsFromFile.map((lookup) => [lookup.name, lookup])
      );
      const resourceIdentifier = new ResourceIdentifier('splunk');
      const lookupsToUpsert: RuleMigrationResourceData[] = [];
      let missingLookupsIt: string[] = missingLookups;

      while (missingLookupsIt.length > 0) {
        const lookups: RuleMigrationResourceData[] = [];
        missingLookupsIt.forEach((lookupName) => {
          const lookup = lookupsIndexed[lookupName];
          if (lookup) {
            lookups.push(lookup);
          } else {
            // Macro missing from file
          }
        });
        lookupsToUpsert.push(...lookups);

        missingLookupsIt = resourceIdentifier
          .fromResources(lookups)
          .reduce<string[]>((acc, resource) => {
            if (resource.type === 'list') {
              acc.push(resource.name);
            }
            return acc;
          }, []);
      }

      if (lookupsToUpsert.length === 0) {
        return; // No missing lookups provided
      }
      upsertResources(migrationStats.id, lookupsToUpsert);
    },
    [upsertResources, migrationStats, missingLookups]
  );

  const uploadStepStatus = useMemo(() => {
    if (isLoading) {
      return 'loading';
    }
    if (error) {
      return 'danger';
    }
    return status;
  }, [isLoading, error, status]);

  return {
    title: i18n.LOOKUPS_DATA_INPUT_FILE_UPLOAD_TITLE,
    status: uploadStepStatus,
    children: (
      <LookupsFileUpload
        createResources={upsertMigrationResources}
        isLoading={isLoading}
        apiError={error?.message}
      />
    ),
  };
};
