/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiFieldNumber,
  EuiDescribedFormGroup,
  EuiSwitch,
  EuiTextColor,
} from '@elastic/eui';

import { ColdPhase as ColdPhaseInterface, Phases } from '../../../services/policies/types';
import { PhaseValidationErrors } from '../../../services/policies/policy_validation';

import {
  LearnMoreLink,
  ActiveBadge,
  PhaseErrorMessage,
  OptionalLabel,
  ErrableFormRow,
  MinAgeInput,
  NodeAllocation,
  SetPriorityInput,
} from '../components';

const freezeLabel = i18n.translate('xpack.indexLifecycleMgmt.coldPhase.freezeIndexLabel', {
  defaultMessage: 'Freeze index',
});

const coldProperty: keyof Phases = 'cold';
const phaseProperty = (propertyName: keyof ColdPhaseInterface) => propertyName;

interface Props {
  setPhaseData: (key: keyof ColdPhaseInterface & string, value: string | boolean) => void;
  phaseData: ColdPhaseInterface;
  isShowingErrors: boolean;
  errors?: PhaseValidationErrors<ColdPhaseInterface>;
  hotPhaseRolloverEnabled: boolean;
}
export class ColdPhase extends PureComponent<Props> {
  render() {
    const {
      setPhaseData,
      phaseData,
      errors,
      isShowingErrors,
      hotPhaseRolloverEnabled,
    } = this.props;

    return (
      <div id="coldPhaseContent" aria-live="polite" role="region">
        <EuiDescribedFormGroup
          title={
            <div>
              <h2 className="eui-displayInlineBlock eui-alignMiddle">
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.coldPhaseLabel"
                  defaultMessage="Cold phase"
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
                  id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.coldPhaseDescriptionText"
                  defaultMessage="You are querying your index less frequently, so you can allocate shards
                  on significantly less performant hardware.
                  Because your queries are slower, you can reduce the number of replicas."
                />
              </p>
              <EuiSwitch
                data-test-subj="enablePhaseSwitch-cold"
                label={
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.activateWarmPhaseSwitchLabel"
                    defaultMessage="Activate cold phase"
                  />
                }
                id={`${coldProperty}-${phaseProperty('phaseEnabled')}`}
                checked={phaseData.phaseEnabled}
                onChange={(e) => {
                  setPhaseData(phaseProperty('phaseEnabled'), e.target.checked);
                }}
                aria-controls="coldPhaseContent"
              />
            </Fragment>
          }
          fullWidth
        >
          <Fragment>
            {phaseData.phaseEnabled ? (
              <Fragment>
                <MinAgeInput<ColdPhaseInterface>
                  errors={errors}
                  phaseData={phaseData}
                  phase={coldProperty}
                  isShowingErrors={isShowingErrors}
                  setPhaseData={setPhaseData}
                  rolloverEnabled={hotPhaseRolloverEnabled}
                />
                <EuiSpacer />

                <NodeAllocation<ColdPhaseInterface>
                  phase={coldProperty}
                  setPhaseData={setPhaseData}
                  errors={errors}
                  phaseData={phaseData}
                  isShowingErrors={isShowingErrors}
                />

                <EuiFlexGroup>
                  <EuiFlexItem grow={false} style={{ maxWidth: 188 }}>
                    <ErrableFormRow
                      id={`${coldProperty}-${phaseProperty('freezeEnabled')}`}
                      label={
                        <Fragment>
                          <FormattedMessage
                            id="xpack.indexLifecycleMgmt.coldPhase.numberOfReplicasLabel"
                            defaultMessage="Number of replicas"
                          />
                          <OptionalLabel />
                        </Fragment>
                      }
                      isShowingErrors={isShowingErrors}
                      errors={errors?.freezeEnabled}
                      helpText={i18n.translate(
                        'xpack.indexLifecycleMgmt.coldPhase.replicaCountHelpText',
                        {
                          defaultMessage: 'By default, the number of replicas remains the same.',
                        }
                      )}
                    >
                      <EuiFieldNumber
                        id={`${coldProperty}-${phaseProperty('selectedReplicaCount')}`}
                        value={phaseData.selectedReplicaCount}
                        onChange={(e) => {
                          setPhaseData(phaseProperty('selectedReplicaCount'), e.target.value);
                        }}
                        min={0}
                      />
                    </ErrableFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </Fragment>
            ) : (
              <div />
            )}
          </Fragment>
        </EuiDescribedFormGroup>
        {phaseData.phaseEnabled ? (
          <Fragment>
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
            <SetPriorityInput<ColdPhaseInterface>
              errors={errors}
              phaseData={phaseData}
              phase={coldProperty}
              isShowingErrors={isShowingErrors}
              setPhaseData={setPhaseData}
            />
          </Fragment>
        ) : null}
      </div>
    );
  }
}
