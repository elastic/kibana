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
  EuiFormRow,
  EuiFieldNumber,
  EuiSwitch,
  EuiDescribedFormGroup,
} from '@elastic/eui';

import { Phases, WarmPhase as WarmPhaseInterface } from '../../../../../common/types';
import { PhaseValidationErrors } from '../../../services/policies/policy_validation';
import {
  LearnMoreLink,
  ActiveBadge,
  PhaseErrorMessage,
  OptionalLabel,
  ErrableFormRow,
  SetPriorityInput,
  MinAgeInput,
  DescribedFormField,
  Forcemerge,
} from '../components';
import { DataTierAllocationField } from './shared';

const i18nTexts = {
  shrinkLabel: i18n.translate('xpack.indexLifecycleMgmt.warmPhase.shrinkIndexLabel', {
    defaultMessage: 'Shrink index',
  }),
  moveToWarmPhaseOnRolloverLabel: i18n.translate(
    'xpack.indexLifecycleMgmt.warmPhase.moveToWarmPhaseOnRolloverLabel',
    {
      defaultMessage: 'Move to warm phase on rollover',
    }
  ),
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
  hotPhaseRolloverEnabled: boolean;
}
export const WarmPhase: FunctionComponent<Props> = ({
  setPhaseData,
  phaseData,
  errors,
  isShowingErrors,
  hotPhaseRolloverEnabled,
}) => {
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
              {phaseData.phaseEnabled && !isShowingErrors ? <ActiveBadge /> : null}
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
              <EuiSwitch
                data-test-subj="enablePhaseSwitch-warm"
                label={
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.activateWarmPhaseSwitchLabel"
                    defaultMessage="Activate warm phase"
                  />
                }
                id={`${warmProperty}-${phaseProperty('phaseEnabled')}`}
                checked={phaseData.phaseEnabled}
                onChange={(e) => {
                  setPhaseData(phaseProperty('phaseEnabled'), e.target.checked);
                }}
                aria-controls="warmPhaseContent"
              />
            </Fragment>
          }
          fullWidth
        >
          <Fragment>
            {phaseData.phaseEnabled ? (
              <Fragment>
                {hotPhaseRolloverEnabled ? (
                  <EuiFormRow id={`${warmProperty}-${phaseProperty('warmPhaseOnRollover')}`}>
                    <EuiSwitch
                      data-test-subj="warmPhaseOnRolloverSwitch"
                      label={i18nTexts.moveToWarmPhaseOnRolloverLabel}
                      id={`${warmProperty}-${phaseProperty('warmPhaseOnRollover')}`}
                      checked={phaseData.warmPhaseOnRollover}
                      onChange={(e) => {
                        setPhaseData(phaseProperty('warmPhaseOnRollover'), e.target.checked);
                      }}
                    />
                  </EuiFormRow>
                ) : null}
                {!phaseData.warmPhaseOnRollover ? (
                  <Fragment>
                    <EuiSpacer size="m" />
                    <MinAgeInput<WarmPhaseInterface>
                      errors={errors}
                      phaseData={phaseData}
                      phase={warmProperty}
                      isShowingErrors={isShowingErrors}
                      setPhaseData={setPhaseData}
                      rolloverEnabled={hotPhaseRolloverEnabled}
                    />
                  </Fragment>
                ) : null}
              </Fragment>
            ) : null}
          </Fragment>
        </EuiDescribedFormGroup>

        {phaseData.phaseEnabled ? (
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
            <Forcemerge
              phase={'warm'}
              phaseData={phaseData}
              setPhaseData={setPhaseData}
              isShowingErrors={isShowingErrors}
              errors={errors}
            />
            <SetPriorityInput<WarmPhaseInterface>
              errors={errors}
              phaseData={phaseData}
              phase={warmProperty}
              isShowingErrors={isShowingErrors}
              setPhaseData={setPhaseData}
            />
          </Fragment>
        ) : null}
      </>
    </div>
  );
};
