/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiFieldNumber,
  EuiSwitch,
  EuiDescribedFormGroup,
} from '@elastic/eui';

import {
  useFormData,
  UseField,
  ToggleField,
  useFormContext,
} from '../../../../../../shared_imports';

import { Phases, WarmPhase as WarmPhaseInterface } from '../../../../../../../common/types';
import { PhaseValidationErrors } from '../../../../../services/policies/policy_validation';

import { useRolloverPath, MinAgeInputField, Forcemerge, SetPriorityInput } from '../shared';

import {
  LearnMoreLink,
  ActiveBadge,
  PhaseErrorMessage,
  OptionalLabel,
  ErrableFormRow,
  DescribedFormField,
} from '../../index';

import { DataTierAllocationField } from '../shared';

const i18nTexts = {
  shrinkLabel: i18n.translate('xpack.indexLifecycleMgmt.warmPhase.shrinkIndexLabel', {
    defaultMessage: 'Shrink index',
  }),
  dataTierAllocation: {
    description: i18n.translate('xpack.indexLifecycleMgmt.warmPhase.dataTier.description', {
      defaultMessage: 'Move data to nodes optimized for less-frequent, read-only access.',
    }),
  },
};

const warmProperty: keyof Phases = 'warm';
const phaseProperty = (propertyName: keyof WarmPhaseInterface) => propertyName;

interface Props {
  setPhaseData: (
    key: keyof WarmPhaseInterface & string,
    value: boolean | string | undefined
  ) => void;
  phaseData: WarmPhaseInterface;
  isShowingErrors: boolean;
  errors?: PhaseValidationErrors<WarmPhaseInterface>;
}
export const WarmPhase: FunctionComponent<Props> = ({ setPhaseData, phaseData, errors }) => {
  const form = useFormContext();
  const [
    {
      [useRolloverPath]: hotPhaseRolloverEnabled,
      '_meta.warm.enabled': enabled,
      '_meta.warm.warmPhaseOnRollover': warmPhaseOnRollover,
    },
  ] = useFormData({
    watch: [useRolloverPath, '_meta.warm.enabled', '_meta.warm.warmPhaseOnRollover'],
  });
  const isShowingErrors = form.isValid === false;
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
              {enabled && !isShowingErrors ? <ActiveBadge /> : null}
              <PhaseErrorMessage isShowingErrors={isShowingErrors} />
            </div>
          }
          titleSize="s"
          description={
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseDescriptionMessage"
                  defaultMessage="You are still querying your index, but it is read-only.
                    You can allocate shards to less performant hardware.
                    For faster searches, you can reduce the number of shards and force merge segments."
                />
              </p>
              <UseField
                path="_meta.warm.enabled"
                component={ToggleField}
                componentProps={{
                  euiFieldProps: {
                    'data-test-subj': 'enablePhaseSwitch-warm',
                    'aria-controls': 'warmPhaseContent',
                  },
                }}
              />
            </Fragment>
          }
          fullWidth
        >
          <Fragment>
            {enabled && (
              <Fragment>
                {hotPhaseRolloverEnabled && (
                  <UseField
                    path="_meta.warm.warmPhaseOnRollover"
                    component={ToggleField}
                    componentProps={{
                      fullWidth: false,
                      euiFieldProps: {
                        'data-test-subj': `${warmProperty}-${phaseProperty('warmPhaseOnRollover')}`,
                      },
                    }}
                  />
                )}
                {(!warmPhaseOnRollover || !hotPhaseRolloverEnabled) && (
                  <>
                    <EuiSpacer size="m" />
                    <MinAgeInputField phase="warm" />
                  </>
                )}
              </Fragment>
            )}
          </Fragment>
        </EuiDescribedFormGroup>

        {enabled && (
          <Fragment>
            {/* Data tier allocation section */}
            <DataTierAllocationField
              description={i18nTexts.dataTierAllocation.description}
              phase={warmProperty}
              setPhaseData={setPhaseData}
              isShowingErrors={isShowingErrors}
              phaseData={phaseData}
            />

            <DescribedFormField
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
                label: i18n.translate(
                  'xpack.indexLifecycleMgmt.editPolicy.warmPhase.numberOfReplicas.switchLabel',
                  { defaultMessage: 'Set replicas' }
                ),
                initialValue: Boolean(phaseData.selectedReplicaCount),
                onChange: (v) => {
                  if (!v) {
                    setPhaseData('selectedReplicaCount', '');
                  }
                },
              }}
              fullWidth
            >
              <ErrableFormRow
                id={`${warmProperty}-${phaseProperty('selectedReplicaCount')}`}
                label={
                  <Fragment>
                    <FormattedMessage
                      id="xpack.indexLifecycleMgmt.warmPhase.numberOfReplicasLabel"
                      defaultMessage="Number of replicas"
                    />
                    <OptionalLabel />
                  </Fragment>
                }
                isShowingErrors={isShowingErrors}
                errors={errors?.selectedReplicaCount}
              >
                <EuiFieldNumber
                  id={`${warmProperty}-${phaseProperty('selectedReplicaCount')}`}
                  value={phaseData.selectedReplicaCount}
                  onChange={(e) => {
                    setPhaseData('selectedReplicaCount', e.target.value);
                  }}
                  min={0}
                />
              </ErrableFormRow>
            </DescribedFormField>
            <EuiDescribedFormGroup
              title={
                <h3>
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.shrinkText"
                    defaultMessage="Shrink"
                  />
                </h3>
              }
              description={
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.shrinkIndexExplanationText"
                    defaultMessage="Shrink the index into a new index with fewer primary shards."
                  />{' '}
                  <LearnMoreLink docPath="indices-shrink-index.html#indices-shrink-index" />
                </EuiTextColor>
              }
              fullWidth
              titleSize="xs"
            >
              <Fragment>
                <EuiSwitch
                  data-test-subj="shrinkSwitch"
                  checked={phaseData.shrinkEnabled}
                  onChange={(e) => {
                    setPhaseData(phaseProperty('shrinkEnabled'), e.target.checked);
                  }}
                  label={i18nTexts.shrinkLabel}
                  aria-label={i18nTexts.shrinkLabel}
                  aria-controls="shrinkContent"
                />

                <div id="shrinkContent" aria-live="polite" role="region">
                  {phaseData.shrinkEnabled ? (
                    <Fragment>
                      <EuiSpacer />
                      <EuiFlexGroup>
                        <EuiFlexItem grow={false}>
                          <ErrableFormRow
                            id={`${warmProperty}-${phaseProperty('selectedPrimaryShardCount')}`}
                            label={i18n.translate(
                              'xpack.indexLifecycleMgmt.warmPhase.numberOfPrimaryShardsLabel',
                              {
                                defaultMessage: 'Number of primary shards',
                              }
                            )}
                            isShowingErrors={isShowingErrors}
                            errors={errors?.selectedPrimaryShardCount}
                          >
                            <EuiFieldNumber
                              id={`${warmProperty}-${phaseProperty('selectedPrimaryShardCount')}`}
                              value={phaseData.selectedPrimaryShardCount}
                              onChange={(e) => {
                                setPhaseData(
                                  phaseProperty('selectedPrimaryShardCount'),
                                  e.target.value
                                );
                              }}
                              min={1}
                            />
                          </ErrableFormRow>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiSpacer />
                    </Fragment>
                  ) : null}
                </div>
              </Fragment>
            </EuiDescribedFormGroup>

            <Forcemerge phase="warm" />

            <SetPriorityInput phase="warm" />
          </Fragment>
        )}
      </>
    </div>
  );
};
