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
  EuiSelect,
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
  PHASE_REPLICA_COUNT
} from '../../../../store/constants';
import { ErrableFormRow } from '../../form_errors';
import { ActiveBadge, PhaseErrorMessage } from '../../../../components';

class ColdPhaseUi extends PureComponent {
  static propTypes = {
    setPhaseData: PropTypes.func.isRequired,
    showNodeDetailsFlyout: PropTypes.func.isRequired,

    isShowingErrors: PropTypes.bool.isRequired,
    errors: PropTypes.object.isRequired,
    phaseData: PropTypes.shape({
      [PHASE_ENABLED]: PropTypes.bool.isRequired,
      [PHASE_ROLLOVER_ALIAS]: PropTypes.string.isRequired,
      [PHASE_ROLLOVER_MINIMUM_AGE]: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string
      ]).isRequired,
      [PHASE_ROLLOVER_MINIMUM_AGE_UNITS]: PropTypes.string.isRequired,
      [PHASE_NODE_ATTRS]: PropTypes.string.isRequired,
      [PHASE_REPLICA_COUNT]: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string
      ]).isRequired
    }).isRequired,
    warmPhaseReplicaCount: PropTypes.number.isRequired,
    nodeOptions: PropTypes.array.isRequired
  };

  componentWillMount() {
    this.props.fetchNodes();
  }

  render() {
    const {
      setPhaseData,
      showNodeDetailsFlyout,
      phaseData,
      nodeOptions,
      warmPhaseReplicaCount,
      errors,
      isShowingErrors,
      intl
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
            {phaseData[PHASE_ENABLED] ? (
              <ActiveBadge />
            ) : null}
          </div>
        }
        titleSize="s"
        description={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.coldPhaseDescriptionText"
                defaultMessage="A cold index is queried less frequently and thus no longer needs to be on the most performant hardware."
              />
            </p>
            <PhaseErrorMessage isShowingErrors={isShowingErrors} />
          </Fragment>
        }
        fullWidth
      >
        {phaseData[PHASE_ENABLED] ? (
          <Fragment>

            <div>
              <EuiSpacer />
              <EuiButton
                color="danger"
                onClick={async () => {
                  await setPhaseData(PHASE_ENABLED, false);
                }}
              >
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.deactivateColdPhaseButton"
                  defaultMessage="Deactivate cold phase"
                />
              </EuiButton>
            </div>

            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <ErrableFormRow
                  id={`${PHASE_COLD}.${PHASE_ROLLOVER_MINIMUM_AGE}`}
                  label={intl.formatMessage({
                    id: 'xpack.indexLifecycleMgmt.coldPhase.moveToColdPhaseAfterLabel',
                    defaultMessage: 'Cold phase after'
                  })}
                  errorKey={PHASE_ROLLOVER_MINIMUM_AGE}
                  isShowingErrors={isShowingErrors}
                  errors={errors}
                >
                  <EuiFieldNumber
                    value={phaseData[PHASE_ROLLOVER_MINIMUM_AGE]}
                    onChange={async e => {
                      setPhaseData(PHASE_ROLLOVER_MINIMUM_AGE, e.target.value);
                    }}
                    min={1}
                  />
                </ErrableFormRow>
              </EuiFlexItem>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <EuiFormRow hasEmptyLabelSpace>
                  <EuiSelect
                    value={phaseData[PHASE_ROLLOVER_MINIMUM_AGE_UNITS]}
                    onChange={e =>
                      setPhaseData(PHASE_ROLLOVER_MINIMUM_AGE_UNITS, e.target.value)
                    }
                    options={[
                      { value: 'd', text: intl.formatMessage({
                        id: 'xpack.indexLifecycleMgmt.coldPhase.daysLabel',
                        defaultMessage: 'days'
                      }) },
                      { value: 'h', text: intl.formatMessage({
                        id: 'xpack.indexLifecycleMgmt.coldPhase.hoursLabel',
                        defaultMessage: 'hours'
                      }) },
                    ]}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer />

            <ErrableFormRow
              id={`${PHASE_COLD}.${PHASE_NODE_ATTRS}`}
              label={intl.formatMessage({
                id: 'xpack.indexLifecycleMgmt.coldPhase.nodeAllocationLabel',
                defaultMessage: 'Choose where to allocate indices by node attribute'
              })}
              errorKey={PHASE_NODE_ATTRS}
              isShowingErrors={isShowingErrors}
              errors={errors}
              helpText={phaseData[PHASE_NODE_ATTRS] ? (
                <EuiButtonEmpty
                  flush="left"
                  iconType="eye"
                  onClick={() => showNodeDetailsFlyout(phaseData[PHASE_NODE_ATTRS])}
                >
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.viewNodeDetailsButton"
                    defaultMessage="View a list of nodes attached to this configuration"
                  />
                </EuiButtonEmpty>
              ) : null}
            >
              <EuiSelect
                value={phaseData[PHASE_NODE_ATTRS] || ' '}
                options={nodeOptions}
                onChange={async e => {
                  await setPhaseData(PHASE_NODE_ATTRS, e.target.value);
                }}
              />
            </ErrableFormRow>

            <EuiFlexGroup>
              <EuiFlexItem grow={false} style={{ maxWidth: 188 }}>
                <ErrableFormRow
                  id={`${PHASE_COLD}.${PHASE_REPLICA_COUNT}`}
                  label={intl.formatMessage({
                    id: 'xpack.indexLifecycleMgmt.coldPhase.numberOfReplicasLabel',
                    defaultMessage: 'Number of replicas'
                  })}
                  errorKey={PHASE_REPLICA_COUNT}
                  isShowingErrors={isShowingErrors}
                  errors={errors}
                >
                  <EuiFieldNumber
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
                    onClick={() =>
                      setPhaseData(PHASE_REPLICA_COUNT, warmPhaseReplicaCount)
                    }
                  >
                    Set to same as warm phase
                  </EuiButtonEmpty>
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </Fragment>
        ) : (
          <div>
            <EuiSpacer />
            <EuiButton
              onClick={async () => {
                await setPhaseData(PHASE_ENABLED, true);

              }}
            >
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.activateColdPhaseButton"
                defaultMessage="Activate cold phase"
              />
            </EuiButton>
          </div>
        )}
      </EuiDescribedFormGroup>
    );
  }
}
export const ColdPhase = injectI18n(ColdPhaseUi);
