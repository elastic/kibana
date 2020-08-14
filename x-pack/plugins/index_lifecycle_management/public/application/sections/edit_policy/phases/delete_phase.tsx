/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiDescribedFormGroup, EuiSwitch, EuiTextColor, EuiFormRow } from '@elastic/eui';

import { PHASE_DELETE, PHASE_ENABLED, PHASE_WAIT_FOR_SNAPSHOT_POLICY } from '../../../constants';
import {
  ActiveBadge,
  LearnMoreLink,
  OptionalLabel,
  PhaseErrorMessage,
  MinAgeInput,
  SnapshotPolicies,
} from '../components';
import { DeletePhase as DeletePhaseInterface } from '../../../services/policies/policies';

interface Props {
  setPhaseData: (key: string, value: any) => void;
  phaseData: DeletePhaseInterface;
  isShowingErrors: boolean;
  errors: Record<string, string[]>;
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
                id={`${PHASE_DELETE}-${PHASE_ENABLED}`}
                checked={phaseData.phaseEnabled}
                onChange={(e) => {
                  setPhaseData(PHASE_ENABLED, e.target.checked);
                }}
                aria-controls="deletePhaseContent"
              />
            </Fragment>
          }
          fullWidth
        >
          {phaseData.phaseEnabled ? (
            <MinAgeInput
              errors={errors}
              phaseData={phaseData}
              phase={PHASE_DELETE}
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
                onChange={(value) => setPhaseData(PHASE_WAIT_FOR_SNAPSHOT_POLICY, value)}
                getUrlForApp={getUrlForApp}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        ) : null}
      </div>
    );
  }
}
