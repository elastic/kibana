/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';

import { EuiDescribedFormGroup, EuiTextColor, EuiAccordion } from '@elastic/eui';

import { Phases } from '../../../../../../../common/types';

import { useFormData, UseField, ToggleField, NumericField } from '../../../../../../shared_imports';

import { useEditPolicyContext } from '../../../edit_policy_context';
import { useConfigurationIssues } from '../../../form';

import {
  LearnMoreLink,
  ActiveBadge,
  DescribedFormRow,
  ToggleFieldWithDescribedFormRow,
} from '../../';

import {
  MinAgeInputField,
  DataTierAllocationField,
  SetPriorityInputField,
  SearchableSnapshotField,
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
  searchableSnapshot: 'phases.cold.actions.searchable_snapshot.snapshot_repository',
};

export const ColdPhase: FunctionComponent = () => {
  const { policy } = useEditPolicyContext();
  const { isUsingSearchableSnapshotInHotPhase } = useConfigurationIssues();

  const [formData] = useFormData({
    watch: [formFieldPaths.enabled, formFieldPaths.searchableSnapshot],
  });

  const enabled = get(formData, formFieldPaths.enabled);
  const showReplicasField = get(formData, formFieldPaths.searchableSnapshot) == null;

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
            <SearchableSnapshotField phase="cold" />

            <EuiAccordion
              id="ilmWarmPhaseAdvancedSettings"
              buttonContent={i18n.translate(
                'xpack.indexLifecycleMgmt.warmPhase.advancedSettingsButton',
                {
                  defaultMessage: 'Advanced settings',
                }
              )}
              paddingSize="m"
            >
              {
                /* Replicas section */
                showReplicasField && (
                  <DescribedFormRow
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
                      initialValue:
                        policy.phases.cold?.actions?.allocate?.number_of_replicas != null,
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
                  </DescribedFormRow>
                )
              }

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
                phase={coldProperty}
              />
              <SetPriorityInputField phase={coldProperty} />
            </EuiAccordion>
          </>
        )}
      </>
    </div>
  );
};
