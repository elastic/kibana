/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';

import { EuiSpacer, EuiDescribedFormGroup, EuiAccordion } from '@elastic/eui';

import { useFormData, UseField, ToggleField, NumericField } from '../../../../../../shared_imports';

import { Phases } from '../../../../../../../common/types';

import { useEditPolicyContext } from '../../../edit_policy_context';
import { useConfigurationIssues } from '../../../form';

import { ActiveBadge, DescribedFormRow } from '../../';

import {
  MinAgeInputField,
  ForcemergeField,
  SetPriorityInputField,
  DataTierAllocationField,
  ShrinkField,
  ReadonlyField,
} from '../shared_fields';

const i18nTexts = {
  dataTierAllocation: {
    description: i18n.translate('xpack.indexLifecycleMgmt.warmPhase.dataTier.description', {
      defaultMessage: 'Move data to nodes optimized for less-frequent, read-only access.',
    }),
  },
};

const warmProperty: keyof Phases = 'warm';

const formFieldPaths = {
  enabled: '_meta.warm.enabled',
  warmPhaseOnRollover: '_meta.warm.warmPhaseOnRollover',
};

export const WarmPhase: FunctionComponent = () => {
  const { policy } = useEditPolicyContext();
  const { isUsingSearchableSnapshotInHotPhase, isUsingRollover } = useConfigurationIssues();
  const [formData] = useFormData({
    watch: [formFieldPaths.enabled, formFieldPaths.warmPhaseOnRollover],
  });

  const enabled = get(formData, formFieldPaths.enabled);
  const warmPhaseOnRollover = get(formData, formFieldPaths.warmPhaseOnRollover);

  return (
    <div id="warmPhaseContent" aria-live="polite" role="region" aria-relevant="additions">
      <>
        <EuiDescribedFormGroup
          title={
            <div>
              <h2 className="eui-displayInlineBlock eui-alignMiddle">
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseLabel"
                  defaultMessage="Warm phase"
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
                  id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseDescriptionMessage"
                  defaultMessage="You are still querying your index, but it is read-only.
                    You can allocate shards to less performant hardware.
                    For faster searches, you can reduce the number of shards and force merge segments."
                />
              </p>
              <UseField
                path={formFieldPaths.enabled}
                component={ToggleField}
                componentProps={{
                  euiFieldProps: {
                    'data-test-subj': 'enablePhaseSwitch-warm',
                    'aria-controls': 'warmPhaseContent',
                  },
                }}
              />
            </>
          }
          fullWidth
        >
          <>
            {enabled && (
              <>
                {isUsingRollover && (
                  <UseField
                    path={formFieldPaths.warmPhaseOnRollover}
                    component={ToggleField}
                    componentProps={{
                      fullWidth: false,
                      euiFieldProps: {
                        'data-test-subj': `${warmProperty}-warmPhaseOnRollover`,
                      },
                    }}
                  />
                )}
                {(!warmPhaseOnRollover || !isUsingRollover) && (
                  <>
                    <EuiSpacer size="m" />
                    <MinAgeInputField phase="warm" />
                  </>
                )}
              </>
            )}
          </>
        </EuiDescribedFormGroup>

        {enabled && (
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
            <DescribedFormRow
              title={
                <h3>
                  {i18n.translate('xpack.indexLifecycleMgmt.warmPhase.replicasTitle', {
                    defaultMessage: 'Replicas',
                  })}
                </h3>
              }
              description={i18n.translate(
                'xpack.indexLifecycleMgmt.warmPhase.numberOfReplicasDescription',
                {
                  defaultMessage:
                    'Set the number of replicas. Remains the same as the previous phase by default.',
                }
              )}
              switchProps={{
                'data-test-subj': 'warm-setReplicasSwitch',
                label: i18n.translate(
                  'xpack.indexLifecycleMgmt.editPolicy.warmPhase.numberOfReplicas.switchLabel',
                  { defaultMessage: 'Set replicas' }
                ),
                initialValue: policy.phases.warm?.actions?.allocate?.number_of_replicas != null,
              }}
              fullWidth
            >
              <UseField
                path="phases.warm.actions.allocate.number_of_replicas"
                component={NumericField}
                componentProps={{
                  fullWidth: false,
                  euiFieldProps: {
                    'data-test-subj': `${warmProperty}-selectedReplicaCount`,
                    min: 0,
                  },
                }}
              />
            </DescribedFormRow>

            {!isUsingSearchableSnapshotInHotPhase && <ShrinkField phase="warm" />}

            {!isUsingSearchableSnapshotInHotPhase && <ForcemergeField phase="warm" />}

            <ReadonlyField phase={'warm'} />

            {/* Data tier allocation section */}
            <DataTierAllocationField
              description={i18nTexts.dataTierAllocation.description}
              phase={warmProperty}
            />
            <SetPriorityInputField phase="warm" />
          </EuiAccordion>
        )}
      </>
    </div>
  );
};
