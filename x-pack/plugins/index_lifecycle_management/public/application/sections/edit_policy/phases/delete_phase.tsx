/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiDescribedFormGroup, EuiSwitch, EuiTextColor, EuiFormRow } from '@elastic/eui';

import { DeletePhase as DeletePhaseInterface, Phases } from '../../../services/policies/types';
import { PhaseValidationErrors } from '../../../services/policies/policy_validation';

import {
  ActiveBadge,
  LearnMoreLink,
  OptionalLabel,
  PhaseErrorMessage,
  MinAgeInput,
  SnapshotPolicies,
} from '../components';

const deleteProperty: keyof Phases = 'delete';
const phaseProperty = (propertyName: keyof DeletePhaseInterface) => propertyName;

interface Props {
  setPhaseData: (key: keyof DeletePhaseInterface & string, value: string | boolean) => void;
  phaseData: DeletePhaseInterface;
  isShowingErrors: boolean;
  errors?: PhaseValidationErrors<DeletePhaseInterface>;
  hotPhaseRolloverEnabled: boolean;
  getUrlForApp: (
    appId: string,
    options?: {
      path?: string;
      absolute?: boolean;
    }
  ) => string;
}

export class DeletePhase extends PureComponent<Props> {
  render() {
    const {
      setPhaseData,
      phaseData,
      errors,
      isShowingErrors,
      hotPhaseRolloverEnabled,
      getUrlForApp,
    } = this.props;

    return (
      <div id="deletePhaseContent" aria-live="polite" role="region">
        <EuiDescribedFormGroup
          title={
            <div>
              <h2 className="eui-displayInlineBlock eui-alignMiddle">
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.deletePhaseLabel"
                  defaultMessage="Delete phase"
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
                  id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.deletePhaseDescriptionText"
                  defaultMessage="You no longer need your index.  You can define when it is safe to delete it."
                />
              </p>
              <EuiSwitch
                data-test-subj="enablePhaseSwitch-delete"
                label={
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.activateWarmPhaseSwitchLabel"
                    defaultMessage="Activate delete phase"
                  />
                }
                id={`${deleteProperty}-${phaseProperty('phaseEnabled')}`}
                checked={phaseData.phaseEnabled}
                onChange={(e) => {
                  setPhaseData(phaseProperty('phaseEnabled'), e.target.checked);
                }}
                aria-controls="deletePhaseContent"
              />
            </Fragment>
          }
          fullWidth
        >
          {phaseData.phaseEnabled ? (
            <MinAgeInput<DeletePhaseInterface>
              errors={errors}
              phaseData={phaseData}
              phase={deleteProperty}
              isShowingErrors={isShowingErrors}
              setPhaseData={setPhaseData}
              rolloverEnabled={hotPhaseRolloverEnabled}
            />
          ) : (
            <div />
          )}
        </EuiDescribedFormGroup>
        {phaseData.phaseEnabled ? (
          <EuiDescribedFormGroup
            title={
              <h3>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.waitForSnapshotTitle"
                  defaultMessage="Wait for snapshot policy"
                />
              </h3>
            }
            description={
              <EuiTextColor color="subdued">
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.waitForSnapshotDescription"
                  defaultMessage="Specify a snapshot policy to be executed before the deletion of the index. This ensures that a snapshot of the deleted index is available."
                />{' '}
                <LearnMoreLink docPath="ilm-wait-for-snapshot.html" />
              </EuiTextColor>
            }
            titleSize="xs"
            fullWidth
          >
            <EuiFormRow
              id="deletePhaseWaitForSnapshot"
              label={
                <Fragment>
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.waitForSnapshotLabel"
                    defaultMessage="Snapshot policy name"
                  />
                  <OptionalLabel />
                </Fragment>
              }
            >
              <SnapshotPolicies
                value={phaseData.waitForSnapshotPolicy}
                onChange={(value) => setPhaseData(phaseProperty('waitForSnapshotPolicy'), value)}
                getUrlForApp={getUrlForApp}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        ) : null}
      </div>
    );
  }
}
