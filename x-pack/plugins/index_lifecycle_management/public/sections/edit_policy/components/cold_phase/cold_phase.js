/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiFormRow,
  EuiFieldNumber,
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiButton,
} from '@elastic/eui';
import {
  PHASE_COLD,
  PHASE_ENABLED,
  PHASE_ROLLOVER_ALIAS,
  PHASE_ROLLOVER_MINIMUM_AGE,
  PHASE_ROLLOVER_MINIMUM_AGE_UNITS,
  PHASE_NODE_ATTRS,
  PHASE_REPLICA_COUNT,
} from '../../../../store/constants';
import { ErrableFormRow } from '../../form_errors';
import { MinAgeInput } from '../min_age_input';
import { ActiveBadge, PhaseErrorMessage, OptionalLabel } from '../../../components';
import { NodeAllocation } from '../node_allocation';

class ColdPhaseUi extends PureComponent {
  static propTypes = {
    setPhaseData: PropTypes.func.isRequired,
    showNodeDetailsFlyout: PropTypes.func.isRequired,

    isShowingErrors: PropTypes.bool.isRequired,
    errors: PropTypes.object.isRequired,
    phaseData: PropTypes.shape({
      [PHASE_ENABLED]: PropTypes.bool.isRequired,
      [PHASE_ROLLOVER_ALIAS]: PropTypes.string.isRequired,
      [PHASE_ROLLOVER_MINIMUM_AGE]: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
        .isRequired,
      [PHASE_ROLLOVER_MINIMUM_AGE_UNITS]: PropTypes.string.isRequired,
      [PHASE_NODE_ATTRS]: PropTypes.string.isRequired,
      [PHASE_REPLICA_COUNT]: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    }).isRequired,
    warmPhaseReplicaCount: PropTypes.number.isRequired,
  };
  render() {
    const {
      setPhaseData,
      showNodeDetailsFlyout,
      phaseData,
      warmPhaseReplicaCount,
      errors,
      isShowingErrors,
    } = this.props;

    return (
      <EuiDescribedFormGroup
        title={
          <div>
            <span className="eui-displayInlineBlock eui-alignMiddle">
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.coldPhaseLabel"
                defaultMessage="Cold phase"
              />
            </span>{' '}
            {phaseData[PHASE_ENABLED] && !isShowingErrors ? <ActiveBadge /> : null}
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
            {phaseData[PHASE_ENABLED] ? (
              <EuiButton
                color="danger"
                onClick={async () => {
                  await setPhaseData(PHASE_ENABLED, false);
                }}
                aria-controls="coldPhaseContent"
              >
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.coldhase.deactivateColdPhaseButton"
                  defaultMessage="Deactivate cold phase"
                />
              </EuiButton>
            ) : (
              <EuiButton
                data-test-subj="activatePhaseButton-cold"
                onClick={async () => {
                  await setPhaseData(PHASE_ENABLED, true);
                }}
                aria-controls="coldPhaseContent"
              >
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.activateColdPhaseButton"
                  defaultMessage="Activate cold phase"
                />
              </EuiButton>
            )}
          </Fragment>
        }
        fullWidth
      >
        <div id="coldPhaseContent" aria-live="polite" role="region">
          {phaseData[PHASE_ENABLED] ? (
            <Fragment>
              <MinAgeInput
                errors={errors}
                phaseData={phaseData}
                phase={PHASE_COLD}
                isShowingErrors={isShowingErrors}
                setPhaseData={setPhaseData}
              />
              <EuiSpacer />

              <NodeAllocation
                phase={PHASE_COLD}
                setPhaseData={setPhaseData}
                showNodeDetailsFlyout={showNodeDetailsFlyout}
                errors={errors}
                phaseData={phaseData}
                isShowingErrors={isShowingErrors}
              />

              <EuiFlexGroup>
                <EuiFlexItem grow={false} style={{ maxWidth: 188 }}>
                  <ErrableFormRow
                    id={`${PHASE_COLD}-${PHASE_REPLICA_COUNT}`}
                    label={
                      <Fragment>
                        <FormattedMessage
                          id="xpack.indexLifecycleMgmt.coldPhase.numberOfReplicasLabel"
                          defaultMessage="Number of replicas"
                        />
                        <OptionalLabel />
                      </Fragment>
                    }
                    errorKey={PHASE_REPLICA_COUNT}
                    isShowingErrors={isShowingErrors}
                    errors={errors}
                  >
                    <EuiFieldNumber
                      id={`${PHASE_COLD}-${PHASE_REPLICA_COUNT}`}
                      value={phaseData[PHASE_REPLICA_COUNT]}
                      onChange={async e => {
                        await setPhaseData(PHASE_REPLICA_COUNT, e.target.value);
                      }}
                      min={0}
                    />
                  </ErrableFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormRow hasEmptyLabelSpace>
                    <EuiButtonEmpty
                      flush="left"
                      onClick={() => setPhaseData(PHASE_REPLICA_COUNT, warmPhaseReplicaCount)}
                    >
                    Set to same number as warm phase
                    </EuiButtonEmpty>
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </Fragment>
          ) : <div />}
        </div>
      </EuiDescribedFormGroup>
    );
  }
}
export const ColdPhase = injectI18n(ColdPhaseUi);
