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
} from '@elastic/eui';
import {
  PHASE_ENABLED,
  PHASE_ROLLOVER_ENABLED,
  PHASE_ROLLOVER_AFTER,
  PHASE_ROLLOVER_AFTER_UNITS,
} from '../../../../../../store/constants';
import { ErrableFormRow } from '../../../../form_errors';

export class DeletePhase extends PureComponent {
  static propTypes = {
    setPhaseData: PropTypes.func.isRequired,
    validate: PropTypes.func.isRequired,

    isShowingErrors: PropTypes.bool.isRequired,
    errors: PropTypes.object.isRequired,
    phaseData: PropTypes.shape({
      [PHASE_ENABLED]: PropTypes.bool.isRequired,
      [PHASE_ROLLOVER_ENABLED]: PropTypes.bool.isRequired,
      [PHASE_ROLLOVER_AFTER]: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string
      ]).isRequired,
      [PHASE_ROLLOVER_AFTER_UNITS]: PropTypes.string.isRequired
    }).isRequired
  };

  render() {
    const {
      setPhaseData,
      validate,
      phaseData,
      errors,
      isShowingErrors
    } = this.props;

    return (
      <EuiAccordion
        id="delete"
        buttonContent={
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <div
                style={{
                  background: '#333',
                  borderRadius: 4,
                  height: 64,
                  width: 64,
                  lineHeight: '64px',
                  textAlign: 'center',
                  color: 'white'
                }}
              >
                <EuiIcon type="indexClose" size="xl" />
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h4>Delete phase</h4>
              </EuiTitle>
              <EuiTextColor color="subdued">
                <EuiText>
                  <p>
                    This phase is optional. Your data is no longer useful. Define how long you want to retain it.
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
                label="Delete indices after"
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
        </div>
      </EuiAccordion>
    );
  }
}
