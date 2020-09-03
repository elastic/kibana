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

import {
  LearnMoreLink,
  ActiveBadge,
  PhaseErrorMessage,
  OptionalLabel,
  ErrableFormRow,
  SetPriorityInput,
  MinAgeInput,
  DataTierAllocation,
  DescribedFormField,
  NodesDataProvider,
  DefaultAllocationWarning,
} from '../components';

import { Phases, WarmPhase as WarmPhaseInterface } from '../../../services/policies/types';
import { PhaseValidationErrors } from '../../../services/policies/policy_validation';

const i18nTexts = {
  shrinkLabel: i18n.translate('xpack.indexLifecycleMgmt.warmPhase.shrinkIndexLabel', {
    defaultMessage: 'Shrink index',
  }),
  forcemergeLabel: i18n.translate('xpack.indexLifecycleMgmt.warmPhase.forceMergeDataLabel', {
    defaultMessage: 'Force merge data',
  }),
  moveToWarmPhaseOnRolloverLabel: i18n.translate(
    'xpack.indexLifecycleMgmt.warmPhase.moveToWarmPhaseOnRolloverLabel',
    {
      defaultMessage: 'Move to warm phase on rollover',
    }
  ),
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
            <NodesDataProvider>
              {(nodesData) => (
                <EuiDescribedFormGroup
                  title={
                    <h3>
                      {i18n.translate(
                        'xpack.indexLifecycleMgmt.editPolicy.warmPhase.dataTierAllocationTitle',
                        { defaultMessage: 'Data tier allocation' }
                      )}
                    </h3>
                  }
                  description={
                    <>
                      <FormattedMessage
                        id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.dataTierAllocationDescription"
                        defaultMessage="Allocate warm phase data to nodes in the cluster."
                      />
                      {
                        <DefaultAllocationWarning
                          phase={warmProperty}
                          nodesByRoles={nodesData.nodesByRoles}
                          currentAllocationType={phaseData.dataTierAllocationType}
                        />
                      }
                    </>
                  }
                  fullWidth
                >
                  <EuiFormRow>
                    <DataTierAllocation
                      phase={warmProperty}
                      setPhaseData={setPhaseData}
                      errors={errors}
                      phaseData={phaseData}
                      isShowingErrors={isShowingErrors}
                      nodes={nodesData.nodesByAttributes}
                    />
                  </EuiFormRow>
                </EuiDescribedFormGroup>
              )}
            </NodesDataProvider>

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
                    'Set the number of replicas. By default, the number of replicas remains the same.',
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
            <EuiDescribedFormGroup
              title={
                <h3>
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.forceMergeDataText"
                    defaultMessage="Force merge"
                  />
                </h3>
              }
              description={
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.forceMergeDataExplanationText"
                    defaultMessage="Reduce the number of segments in your shard by merging smaller files and clearing deleted ones."
                  />{' '}
                  <LearnMoreLink docPath="indices-forcemerge.html" />
                </EuiTextColor>
              }
              titleSize="xs"
              fullWidth
            >
              <EuiSwitch
                data-test-subj="forceMergeSwitch"
                label={i18nTexts.forcemergeLabel}
                aria-label={i18nTexts.forcemergeLabel}
                checked={phaseData.forceMergeEnabled}
                onChange={(e) => {
                  setPhaseData(phaseProperty('forceMergeEnabled'), e.target.checked);
                }}
                aria-controls="forcemergeContent"
              />

              <EuiSpacer />
              <div id="forcemergeContent" aria-live="polite" role="region">
                {phaseData.forceMergeEnabled ? (
                  <ErrableFormRow
                    id={`${warmProperty}-${phaseProperty('selectedForceMergeSegments')}`}
                    label={i18n.translate(
                      'xpack.indexLifecycleMgmt.warmPhase.numberOfSegmentsLabel',
                      {
                        defaultMessage: 'Number of segments',
                      }
                    )}
                    isShowingErrors={isShowingErrors}
                    errors={errors?.selectedForceMergeSegments}
                  >
                    <EuiFieldNumber
                      id={`${warmProperty}-${phaseProperty('selectedForceMergeSegments')}`}
                      value={phaseData.selectedForceMergeSegments}
                      onChange={(e) => {
                        setPhaseData(phaseProperty('selectedForceMergeSegments'), e.target.value);
                      }}
                      min={1}
                    />
                  </ErrableFormRow>
                ) : null}
              </div>
            </EuiDescribedFormGroup>
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
