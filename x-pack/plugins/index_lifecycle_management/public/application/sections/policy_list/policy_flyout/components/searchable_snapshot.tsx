/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';
import {
  SerializedColdPhase,
  SerializedFrozenPhase,
  SerializedHotPhase,
} from '../../../../../../common/types';
import { i18nTexts } from '../../../edit_policy/i18n_texts';
import { ActionDescription } from './action_description';
import type { ActionComponentProps } from './types';

export const SearchableSnapshot = ({ phase, phases }: ActionComponentProps) => {
  const phaseConfig = phases[phase];
  const searchableSnapshot = (
    phaseConfig as SerializedHotPhase | SerializedColdPhase | SerializedFrozenPhase
  ).actions?.searchable_snapshot;
  return searchableSnapshot ? (
    <ActionDescription
      title={i18nTexts.editPolicy.searchableSnapshotLabel}
      descriptionItems={[
        <>
          {`${i18nTexts.editPolicy.searchableSnapshotsRepoFieldLabel}: `}
          <EuiCode>{searchableSnapshot.snapshot_repository}</EuiCode>
        </>,
      ]}
    />
  ) : null;
};
