/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

import {
  FULL_SYNC_LABEL,
  INCREMENTAL_SYNC_LABEL,
  DELETION_SYNC_LABEL,
  PERMISSIONS_SYNC_LABEL,
  FULL_SYNC_DESCRIPTION,
  INCREMENTAL_SYNC_DESCRIPTION,
  DELETION_SYNC_DESCRIPTION,
  PERMISSIONS_SYNC_DESCRIPTION,
} from '../../constants';
import { SourceLogic } from '../../source_logic';

import { FrequencyItem } from './frequency_item';

export const SyncFrequency: React.FC = () => {
  const {
    contentSource: {
      indexing: {
        schedule: {
          full: fullDuration,
          incremental: incrementalDuration,
          delete: deleteDuration,
          permissions: permissionsDuration,
          estimates: {
            full: fullEstimate,
            incremental: incrementalEstimate,
            delete: deleteEstimate,
            permissions: permissionsEstimate,
          },
        },
      },
    },
  } = useValues(SourceLogic);

  return (
    <>
      <EuiSpacer />
      <FrequencyItem
        label={FULL_SYNC_LABEL}
        description={FULL_SYNC_DESCRIPTION}
        duration={fullDuration}
        estimate={fullEstimate}
      />
      <EuiHorizontalRule />
      <FrequencyItem
        label={INCREMENTAL_SYNC_LABEL}
        description={INCREMENTAL_SYNC_DESCRIPTION}
        duration={incrementalDuration}
        estimate={incrementalEstimate}
      />
      <EuiHorizontalRule />
      <FrequencyItem
        label={DELETION_SYNC_LABEL}
        description={DELETION_SYNC_DESCRIPTION}
        duration={deleteDuration}
        estimate={deleteEstimate}
      />
      {permissionsDuration && permissionsEstimate && (
        <>
          <EuiHorizontalRule />
          <FrequencyItem
            label={PERMISSIONS_SYNC_LABEL}
            description={PERMISSIONS_SYNC_DESCRIPTION}
            duration={permissionsDuration}
            estimate={permissionsEstimate}
          />
        </>
      )}
    </>
  );
};
