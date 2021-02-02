/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';

import { EuiTextColor } from '@elastic/eui';

import { useFormData } from '../../../../../../shared_imports';

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
    description: i18n.translate('xpack.indexLifecycleMgmt.coldPhase.dataTier.description', {
      defaultMessage:
        'Move data to nodes optimized for less frequent, read-only access. Store data in the cold phase on less-expensive hardware.',
    }),
  },
};

const formFieldPaths = {
  enabled: '_meta.cold.enabled',
  searchableSnapshot: 'phases.cold.actions.searchable_snapshot.snapshot_repository',
};

export const ColdPhase: FunctionComponent = () => {
  const { isUsingSearchableSnapshotInHotPhase } = useConfigurationIssues();

  const [formData] = useFormData({
    watch: [formFieldPaths.searchableSnapshot],
  });

  const showReplicasField = get(formData, formFieldPaths.searchableSnapshot) == null;

  return (
    <Phase phase={'cold'}>
      <SearchableSnapshotField phase={'cold'} />

      {showReplicasField && <ReplicasField phase={'cold'} />}

      {/* Freeze section */}
      {!isUsingSearchableSnapshotInHotPhase && (
        <ToggleFieldWithDescribedFormRow
          title={
            <h3>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.freezeText"
                defaultMessage="Freeze"
              />
            </h3>
          }
          description={
            <EuiTextColor color="subdued">
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.freezeIndexExplanationText"
                defaultMessage="Make the index read-only and minimize its memory footprint."
              />{' '}
              <LearnMoreLink docPath="ilm-freeze.html" />
            </EuiTextColor>
          }
          fullWidth
          titleSize="xs"
          switchProps={{
            'data-test-subj': 'freezeSwitch',
            path: '_meta.cold.freezeEnabled',
          }}
        >
          <div />
        </ToggleFieldWithDescribedFormRow>
      )}

      {/* Data tier allocation section */}
      <DataTierAllocationField
        description={i18nTexts.dataTierAllocation.description}
        phase={'cold'}
      />

      <IndexPriorityField phase={'cold'} />
    </Phase>
  );
};
