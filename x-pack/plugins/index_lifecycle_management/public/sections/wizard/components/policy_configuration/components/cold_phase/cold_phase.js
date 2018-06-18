/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiFormRow,
  EuiFieldNumber,
  EuiSelect,
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiBetaBadge,
  EuiButton,
} from '@elastic/eui';
import {
  PHASE_ENABLED,
  PHASE_ROLLOVER_ALIAS,
  PHASE_ROLLOVER_AFTER,
  PHASE_ROLLOVER_AFTER_UNITS,
  PHASE_NODE_ATTRS,
  PHASE_REPLICA_COUNT
} from '../../../../../../store/constants';
import { ErrableFormRow } from '../../../../form_errors';

export class ColdPhase extends PureComponent {
  static propTypes = {
    setPhaseData: PropTypes.func.isRequired,
    validate: PropTypes.func.isRequired,
    showNodeDetailsFlyout: PropTypes.func.isRequired,

    isShowingErrors: PropTypes.bool.isRequired,
    errors: PropTypes.object.isRequired,
    phaseData: PropTypes.shape({
      [PHASE_ENABLED]: PropTypes.bool.isRequired,
      [PHASE_ROLLOVER_ALIAS]: PropTypes.string.isRequired,
      [PHASE_ROLLOVER_AFTER]: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string
      ]).isRequired,
      [PHASE_ROLLOVER_AFTER_UNITS]: PropTypes.string.isRequired,
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
      validate,
      showNodeDetailsFlyout,

      phaseData,
      nodeOptions,
      warmPhaseReplicaCount,
      errors,
      isShowingErrors
    } = this.props;

    return (
      <EuiDescribedFormGroup
        title={
          <div>
            <span className="eui-displayInlineBlock eui-alignMiddle">Cold phase</span>{' '}
            {phaseData[PHASE_ENABLED] ? (
              <EuiBetaBadge label="Enabled" iconType="check" className="eui-alignMiddle" />
            ) : null}
          </div>
        }
        titleSize="s"
        description={
          <Fragment>
            <p>
              Your index is queried less frequently
              and no longer needs to be on the most performant hardware.
            </p>
            {isShowingErrors ? (
              <EuiTextColor color="danger">
                <EuiText>
                  <p>This phase contains errors</p>
                </EuiText>
              </EuiTextColor>
            ) : null}
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
                  validate();
                }}
              >
                Deactive cold phase
              </EuiButton>
            </div>

            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <ErrableFormRow
                  label="Move to cold phase after"
                  errorKey={PHASE_ROLLOVER_AFTER}
                  isShowingErrors={isShowingErrors}
                  errors={errors}
                >
                  <EuiFieldNumber
                    value={phaseData[PHASE_ROLLOVER_AFTER]}
                    onChange={async e => {
                      setPhaseData(PHASE_ROLLOVER_AFTER, e.target.value);
                      validate();
                    }}
                  />
                </ErrableFormRow>
              </EuiFlexItem>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <EuiFormRow hasEmptyLabelSpace>
                  <EuiSelect
                    value={phaseData[PHASE_ROLLOVER_AFTER_UNITS]}
                    onChange={e =>
                      setPhaseData(PHASE_ROLLOVER_AFTER_UNITS, e.target.value)
                    }
                    options={[
                      { value: 'd', text: 'days' },
                      { value: 'h', text: 'hours' }
                    ]}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer />

            <ErrableFormRow
              label="Where would you like to allocate these indices?"
              errorKey={PHASE_NODE_ATTRS}
              isShowingErrors={isShowingErrors}
              errors={errors}
              helpText={phaseData[PHASE_NODE_ATTRS] ? (
                <EuiButtonEmpty
                  flush="left"
                  iconType="eye"
                  onClick={() => showNodeDetailsFlyout(phaseData[PHASE_NODE_ATTRS])}
                >
                  View a list of nodes attached to this configuration
                </EuiButtonEmpty>
              ) : null}
            >
              <EuiSelect
                value={phaseData[PHASE_NODE_ATTRS]}
                options={nodeOptions}
                onChange={async e => {
                  await setPhaseData(PHASE_NODE_ATTRS, e.target.value);
                  validate();
                }}
              />
            </ErrableFormRow>

            <EuiFlexGroup>
              <EuiFlexItem grow={false} style={{ maxWidth: 188 }}>
                <ErrableFormRow
                  label="Number of replicas"
                  errorKey={PHASE_REPLICA_COUNT}
                  isShowingErrors={isShowingErrors}
                  errors={errors}
                >
                  <EuiFieldNumber
                    value={phaseData[PHASE_REPLICA_COUNT]}
                    onChange={async e => {
                      await setPhaseData(PHASE_REPLICA_COUNT, e.target.value);
                      validate();
                    }}
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
                validate();
              }}
            >
              Activate cold phase
            </EuiButton>
          </div>
        )}
      </EuiDescribedFormGroup>
    );
  }
}
