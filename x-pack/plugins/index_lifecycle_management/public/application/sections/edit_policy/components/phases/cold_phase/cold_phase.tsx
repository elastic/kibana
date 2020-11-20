/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';

import { EuiDescribedFormGroup, EuiTextColor } from '@elastic/eui';

import { Phases } from '../../../../../../../common/types';

import { useFormData, UseField, ToggleField, NumericField } from '../../../../../../shared_imports';

import { useEditPolicyContext } from '../../../edit_policy_context';
import { useSearchableSnapshotState } from '../../../form';

import { LearnMoreLink, ActiveBadge, DescribedFormField } from '../../';

import {
  MinAgeInputField,
  DataTierAllocationField,
  SetPriorityInput,
  SearchableSnapshotsField,
} from '../shared_fields';

const i18nTexts = {
  dataTierAllocation: {
    description: i18n.translate('xpack.indexLifecycleMgmt.coldPhase.dataTier.description', {
      defaultMessage:
        'Move data to nodes optimized for less frequent, read-only access. Store data in the cold phase on less-expensive hardware.',
    }),
  },
};

const coldProperty: keyof Phases = 'cold';

const formFieldPaths = {
  enabled: '_meta.cold.enabled',
};

export const ColdPhase: FunctionComponent = () => {
  const { policy } = useEditPolicyContext();
  const { isUsingSearchableSnapshotInHotPhase } = useSearchableSnapshotState();

  const [formData] = useFormData({
    watch: [formFieldPaths.enabled],
  });

  const enabled = get(formData, formFieldPaths.enabled);

  return (
    <div id="coldPhaseContent" aria-live="polite" role="region">
      <>
        {/* Section title group; containing min age */}
        <EuiDescribedFormGroup
          title={
            <div>
              <h2 className="eui-displayInlineBlock eui-alignMiddle">
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.coldPhaseLabel"
                  defaultMessage="Cold phase"
                />
              </h2>{' '}
              {enabled && <ActiveBadge />}
            </div>
          }
          titleSize="s"
          description={
            <>
              <p>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.coldPhaseDescriptionText"
                  defaultMessage="You are querying your index less frequently, so you can allocate shards
                  on significantly less performant hardware.
                  Because your queries are slower, you can reduce the number of replicas."
                />
              </p>
              <UseField
                path={formFieldPaths.enabled}
                component={ToggleField}
                componentProps={{
                  fullWidth: false,
                  euiFieldProps: {
                    'data-test-subj': 'enablePhaseSwitch-cold',
                    'aria-controls': 'coldPhaseContent',
                  },
                }}
              />
            </>
          }
          fullWidth
        >
          {enabled && <MinAgeInputField phase="cold" />}
        </EuiDescribedFormGroup>
        {enabled && (
          <>
            {!isUsingSearchableSnapshotInHotPhase && <SearchableSnapshotsField phase="cold" />}
            {/* Data tier allocation section */}
            <DataTierAllocationField
              description={i18nTexts.dataTierAllocation.description}
              phase={coldProperty}
            />

            {/* Replicas section */}
            <DescribedFormField
              title={
                <h3>
                  {i18n.translate('xpack.indexLifecycleMgmt.coldPhase.replicasTitle', {
                    defaultMessage: 'Replicas',
                  })}
                </h3>
              }
              description={i18n.translate(
                'xpack.indexLifecycleMgmt.coldPhase.numberOfReplicasDescription',
                {
                  defaultMessage:
                    'Set the number of replicas. Remains the same as the previous phase by default.',
                }
              )}
              switchProps={{
                'data-test-subj': 'cold-setReplicasSwitch',
                label: i18n.translate(
                  'xpack.indexLifecycleMgmt.editPolicy.coldPhase.numberOfReplicas.switchLabel',
                  { defaultMessage: 'Set replicas' }
                ),
                initialValue: Boolean(policy.phases.cold?.actions?.allocate?.number_of_replicas),
              }}
              fullWidth
            >
              <UseField
                path="phases.cold.actions.allocate.number_of_replicas"
                component={NumericField}
                componentProps={{
                  fullWidth: false,
                  euiFieldProps: {
                    'data-test-subj': `${coldProperty}-selectedReplicaCount`,
                    min: 0,
                  },
                }}
              />
            </DescribedFormField>
            {/* Freeze section */}
            {!isUsingSearchableSnapshotInHotPhase && (
              <EuiDescribedFormGroup
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
                    <LearnMoreLink docPath="frozen-indices.html" />
                  </EuiTextColor>
                }
                fullWidth
                titleSize="xs"
              >
                <UseField
                  path="_meta.cold.freezeEnabled"
                  component={ToggleField}
                  componentProps={{
                    euiFieldProps: {
                      'data-test-subj': 'freezeSwitch',
                    },
                  }}
                />
              </EuiDescribedFormGroup>
            )}
            <SetPriorityInput phase={coldProperty} />
          </>
        )}
      </>
    </div>
  );
};
