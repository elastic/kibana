/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiDescribedFormGroup,
  EuiSwitch,
  EuiFieldText,
  EuiTextColor,
  EuiFormRow,
} from '@elastic/eui';

import { PHASE_DELETE, PHASE_ENABLED, PHASE_WAIT_FOR_SNAPSHOT_POLICY } from '../../../../constants';
import { ActiveBadge, LearnMoreLink, OptionalLabel, PhaseErrorMessage } from '../../../components';
import { MinAgeInput } from '../min_age_input';

export class DeletePhase extends PureComponent {
  static propTypes = {
    setPhaseData: PropTypes.func.isRequired,
    isShowingErrors: PropTypes.bool.isRequired,
    errors: PropTypes.object.isRequired,
  };

  render() {
    const {
      setPhaseData,
      phaseData,
      errors,
      isShowingErrors,
      hotPhaseRolloverEnabled,
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
              {phaseData[PHASE_ENABLED] && !isShowingErrors ? <ActiveBadge /> : null}
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
                checked={phaseData[PHASE_ENABLED]}
                onChange={(e) => {
                  setPhaseData(PHASE_ENABLED, e.target.checked);
                }}
                aria-controls="deletePhaseContent"
              />
            </Fragment>
          }
          fullWidth
        >
          {phaseData[PHASE_ENABLED] ? (
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
        {phaseData[PHASE_ENABLED] ? (
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
              <EuiFieldText
                data-test-subj="waitForSnapshotField"
                value={phaseData[PHASE_WAIT_FOR_SNAPSHOT_POLICY]}
                onChange={(e) => setPhaseData(PHASE_WAIT_FOR_SNAPSHOT_POLICY, e.target.value)}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        ) : null}
      </div>
    );
  }
}
