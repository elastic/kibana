/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { EuiTextColor } from '@elastic/eui';

import { useConfigurationIssues } from '../../../form';

import { LearnMoreLink, ToggleFieldWithDescribedFormRow } from '../../';

import {
  DataTierAllocationField,
  SearchableSnapshotField,
  IndexPriorityField,
  ReplicasField,
} from '../shared_fields';

import { Phase } from '../phase';

const i18nTexts = {
  dataTierAllocation: {
    description: i18n.translate('xpack.indexLifecycleMgmt.frozenPhase.dataTier.description', {
      defaultMessage:
        'Move read-only data to nodes optimized for long-term storage. Nodes in the frozen phase often use your least expensive hardware.',
    }),
  },
};

export const FrozenPhase: FunctionComponent = () => {
  const {
    isUsingSearchableSnapshotInHotPhase,
    isUsingSearchableSnapshotInColdPhase,
  } = useConfigurationIssues();

  return (
    <Phase phase="frozen" topLevelSettings={<SearchableSnapshotField phase="frozen" />}>
      <ReplicasField phase="frozen" />

      {/* Freeze section */}
      {!isUsingSearchableSnapshotInHotPhase && !isUsingSearchableSnapshotInColdPhase && (
        <ToggleFieldWithDescribedFormRow
          title={
            <h3>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.frozenPhase.freezeText"
                defaultMessage="Freeze"
              />
            </h3>
          }
          description={
            <EuiTextColor color="subdued">
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.frozenPhase.freezeIndexExplanationText"
                defaultMessage="Make the index read-only and minimize its memory footprint."
              />{' '}
              <LearnMoreLink docPath="ilm-freeze.html" />
            </EuiTextColor>
          }
          fullWidth
          titleSize="xs"
          switchProps={{
            'data-test-subj': 'freezeSwitch',
            path: '_meta.frozen.freezeEnabled',
          }}
        >
          <div />
        </ToggleFieldWithDescribedFormRow>
      )}

      {/* Data tier allocation section */}
      <DataTierAllocationField
        description={i18nTexts.dataTierAllocation.description}
        phase="frozen"
      />

      <IndexPriorityField phase="frozen" />
    </Phase>
  );
};
