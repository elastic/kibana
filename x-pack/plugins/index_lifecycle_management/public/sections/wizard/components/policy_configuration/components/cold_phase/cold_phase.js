/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiAccordion,
  EuiFormRow,
  EuiFieldNumber,
  EuiSelect,
  EuiSwitch,
  EuiButtonEmpty,
} from '@elastic/eui';
import {
  PHASE_ENABLED,
  PHASE_ROLLOVER_ENABLED,
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

    isShowingErrors: PropTypes.bool.isRequired,
    errors: PropTypes.object.isRequired,
    phaseData: PropTypes.shape({
      [PHASE_ENABLED]: PropTypes.bool.isRequired,
      [PHASE_ROLLOVER_ENABLED]: PropTypes.bool.isRequired,
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

      phaseData,
      nodeOptions,
      warmPhaseReplicaCount,
      errors,
      isShowingErrors
    } = this.props;

    return (
      <EuiAccordion
        id="cold"
        buttonContent={
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <div
                style={{
                  background: '#0079a5',
                  borderRadius: 4,
                  height: 64,
                  width: 64,
                  lineHeight: '64px',
                  textAlign: 'center',
                  color: 'white'
                }}
              >
                <EuiIcon type="sortDown" size="xl" />
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h4>Cold phase</h4>
              </EuiTitle>
              <EuiTextColor color="subdued">
                <EuiText>
                  <p>
                    This phase is optional. Re-allocate your indices again and
                    modify the number of replicas.
                  </p>
                </EuiText>
              </EuiTextColor>
              {isShowingErrors ? (
                <EuiTextColor color="danger">
                  <EuiText>
                    <p>This phase contains errors that need to be fixed.</p>
                  </EuiText>
                </EuiTextColor>
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        buttonClassName="ilmAccordion__button"
        buttonContentClassName="ilmAccordion__buttonContent"
        extraAction={
          <EuiSwitch
            checked={phaseData[PHASE_ENABLED]}
            onChange={e => setPhaseData(PHASE_ENABLED, e.target.checked)}
            label="Enable this phase"
          />
        }
      >
        <div style={{ padding: '16px 16px 16px 40px', marginLeft: '-16px' }}>
          <EuiTitle size="s">
            <p>Configuration</p>
          </EuiTitle>
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
        </div>
      </EuiAccordion>
    );
  }
}
