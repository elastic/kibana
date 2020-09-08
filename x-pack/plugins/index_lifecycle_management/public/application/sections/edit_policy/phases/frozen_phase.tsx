/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiFieldNumber,
  EuiDescribedFormGroup,
  EuiSwitch,
  EuiTextColor,
  EuiFormRow,
} from '@elastic/eui';

import { FrozenPhase as FrozenPhaseInterface, Phases } from '../../../../../common/types';
import { PhaseValidationErrors } from '../../../services/policies/policy_validation';

import {
  LearnMoreLink,
  ActiveBadge,
  PhaseErrorMessage,
  OptionalLabel,
  ErrableFormRow,
  MinAgeInput,
  SetPriorityInput,
  DefaultAllocationWarning,
  DataTierAllocation,
  DescribedFormField,
  NodesDataProvider,
} from '../components';

const freezeLabel = i18n.translate('xpack.indexLifecycleMgmt.frozenPhase.freezeIndexLabel', {
  defaultMessage: 'Freeze index',
});

const frozenProperty: keyof Phases = 'frozen';
const phaseProperty = (propertyName: keyof FrozenPhaseInterface) => propertyName;

interface Props {
  setPhaseData: (key: keyof FrozenPhaseInterface & string, value: string | boolean) => void;
  phaseData: FrozenPhaseInterface;
  isShowingErrors: boolean;
  errors?: PhaseValidationErrors<FrozenPhaseInterface>;
  hotPhaseRolloverEnabled: boolean;
}
export const FrozenPhase: FunctionComponent<Props> = ({
  setPhaseData,
  phaseData,
  errors,
  isShowingErrors,
  hotPhaseRolloverEnabled,
}) => {
  return (
    <div id="frozenPhaseContent" aria-live="polite" role="region">
      <>
        {/* Section title group; containing min age */}
        <EuiDescribedFormGroup
          title={
            <div>
              <h2 className="eui-displayInlineBlock eui-alignMiddle">
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.frozenPhase.frozenPhaseLabel"
                  defaultMessage="Frozen phase"
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
                  id="xpack.indexLifecycleMgmt.editPolicy.frozenPhase.frozenPhaseDescriptionText"
                  defaultMessage="You are querying your index very infrequently, so you can allocate shards
                  on the least performant hardware.
                  Because your queries are slower, you can reduce the number of replicas."
                />
              </p>
              <EuiSwitch
                data-test-subj="enablePhaseSwitch-frozen"
                label={
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.frozenPhase.activateWarmPhaseSwitchLabel"
                    defaultMessage="Activate frozen phase"
                  />
                }
                id={`${frozenProperty}-${phaseProperty('phaseEnabled')}`}
                checked={phaseData.phaseEnabled}
                onChange={(e) => {
                  setPhaseData(phaseProperty('phaseEnabled'), e.target.checked);
                }}
                aria-controls="frozenPhaseContent"
              />
            </Fragment>
          }
          fullWidth
        >
          {phaseData.phaseEnabled ? (
            <MinAgeInput<FrozenPhaseInterface>
              errors={errors}
              phaseData={phaseData}
              phase={frozenProperty}
              isShowingErrors={isShowingErrors}
              setPhaseData={setPhaseData}
              rolloverEnabled={hotPhaseRolloverEnabled}
            />
          ) : null}
        </EuiDescribedFormGroup>
        {phaseData.phaseEnabled ? (
          <Fragment>
            {/* Data tier allocation section */}
            <NodesDataProvider>
              {(nodesData) => (
                <EuiDescribedFormGroup
                  title={
                    <h3>
                      {i18n.translate(
                        'xpack.indexLifecycleMgmt.editPolicy.frozenPhase.dataTierAllocationTitle',
                        { defaultMessage: 'Data tier allocation' }
                      )}
                    </h3>
                  }
                  description={
                    <>
                      <FormattedMessage
                        id="xpack.indexLifecycleMgmt.editPolicy.frozenPhase.dataTierAllocationDescription"
                        defaultMessage="Allocate frozen phase data to nodes in the cluster."
                      />
                      {
                        <DefaultAllocationWarning
                          phase={frozenProperty}
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
                      phase={frozenProperty}
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

            {/* Replicas section */}
            <DescribedFormField
              title={
                <h3>
                  {i18n.translate('xpack.indexLifecycleMgmt.frozenPhase.replicasTitle', {
                    defaultMessage: 'Replicas',
                  })}
                </h3>
              }
              description={i18n.translate(
                'xpack.indexLifecycleMgmt.frozenPhase.numberOfReplicasDescription',
                {
                  defaultMessage:
                    'Set the number of replicas. By default, the number of replicas remains the same.',
                }
              )}
              switchProps={{
                label: i18n.translate(
                  'xpack.indexLifecycleMgmt.editPolicy.frozenPhase.numberOfReplicas.switchLabel',
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
                id={`${frozenProperty}-${phaseProperty('selectedReplicaCount')}`}
                label={
                  <Fragment>
                    <FormattedMessage
                      id="xpack.indexLifecycleMgmt.frozenPhase.numberOfReplicasLabel"
                      defaultMessage="Number of replicas"
                    />
                    <OptionalLabel />
                  </Fragment>
                }
                isShowingErrors={isShowingErrors}
                errors={errors?.selectedReplicaCount}
                helpText={i18n.translate(
                  'xpack.indexLifecycleMgmt.frozenPhase.replicaCountHelpText',
                  {
                    defaultMessage: 'By default, the number of replicas remains the same.',
                  }
                )}
              >
                <EuiFieldNumber
                  id={`${frozenProperty}-${phaseProperty('selectedReplicaCount')}`}
                  value={phaseData.selectedReplicaCount}
                  onChange={(e) => {
                    setPhaseData(phaseProperty('selectedReplicaCount'), e.target.value);
                  }}
                  min={0}
                />
              </ErrableFormRow>
            </DescribedFormField>
            <EuiDescribedFormGroup
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
                    defaultMessage="A frozen index has little overhead on the cluster and is blocked for write operations.
                    You can search a frozen index, but expect queries to be slower."
                  />{' '}
                  <LearnMoreLink docPath="frozen-indices.html" />
                </EuiTextColor>
              }
              fullWidth
              titleSize="xs"
            >
              <EuiSwitch
                data-test-subj="freezeSwitch"
                checked={phaseData.freezeEnabled}
                onChange={(e) => {
                  setPhaseData(phaseProperty('freezeEnabled'), e.target.checked);
                }}
                label={freezeLabel}
                aria-label={freezeLabel}
              />
            </EuiDescribedFormGroup>
            <SetPriorityInput<FrozenPhaseInterface>
              errors={errors}
              phaseData={phaseData}
              phase={frozenProperty}
              isShowingErrors={isShowingErrors}
              setPhaseData={setPhaseData}
            />
          </Fragment>
        ) : null}
      </>
    </div>
  );
};
