/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import React, { Fragment, PureComponent } from 'react';
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
  EuiFieldNumber,
  EuiSelect,
  EuiSwitch
} from '@elastic/eui';
import {
  PHASE_ROLLOVER_ALIAS,
  PHASE_ROLLOVER_MAX_AGE,
  PHASE_ROLLOVER_MAX_AGE_UNITS,
  PHASE_ROLLOVER_MAX_SIZE_STORED,
  PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS,
  PHASE_ROLLOVER_ENABLED,
  MAX_SIZE_TYPE_DOCUMENT
} from '../../../../../../store/constants';

import { ErrableFormRow } from '../../../../form_errors';

export class HotPhase extends PureComponent {
  static propTypes = {
    setPhaseData: PropTypes.func.isRequired,
    validate: PropTypes.func.isRequired,

    isShowingErrors: PropTypes.bool.isRequired,
    errors: PropTypes.object.isRequired,
    phaseData: PropTypes.shape({
      [PHASE_ROLLOVER_ALIAS]: PropTypes.string.isRequired,
      [PHASE_ROLLOVER_MAX_AGE]: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string
      ]).isRequired,
      [PHASE_ROLLOVER_MAX_AGE_UNITS]: PropTypes.string.isRequired,
      [PHASE_ROLLOVER_MAX_SIZE_STORED]: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string
      ]).isRequired,
      [PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS]: PropTypes.string.isRequired
    }).isRequired
  };

  render() {
    const {
      validate,
      setPhaseData,

      phaseData,
      isShowingErrors,
      errors,
    } = this.props;

    return (
      <EuiAccordion
        id="hot"
        buttonContent={
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <div
                style={{
                  background: '#A30000',
                  borderRadius: 4,
                  height: 64,
                  width: 64,
                  lineHeight: '64px',
                  textAlign: 'center',
                  color: 'white'
                }}
              >
                <EuiIcon type="indexFlush" size="xl" />
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h4>Hot phase</h4>
              </EuiTitle>
              <EuiTextColor color="subdued">
                <EuiText>
                  <p>This phase is required. Rollover data by time and size.</p>
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
      >
        <div style={{ padding: '16px 16px 16px 40px', marginLeft: '-16px' }}>
          <EuiTitle size="s">
            <p>Rollover configuration</p>
          </EuiTitle>
          <EuiSpacer />
          <EuiSwitch
            checked={phaseData[PHASE_ROLLOVER_ENABLED]}
            onChange={async e => {
              await setPhaseData(PHASE_ROLLOVER_ENABLED, e.target.checked);
              validate();
            }}
            label="Enable rollover"
          />
          {phaseData[PHASE_ROLLOVER_ENABLED] ? (
            <Fragment>
              <EuiSpacer size="m" />
              {/* <EuiFlexGroup>
                <EuiFlexItem>
                  <ErrableFormRow
                    label="Rollover alias"
                    errorKey={PHASE_ROLLOVER_ALIAS}
                    isShowingErrors={isShowingErrors}
                    errors={errors}
                  >
                    <EuiFieldText
                      value={phaseData[PHASE_ROLLOVER_ALIAS]}
                      onChange={e => {
                        showErrorsFor(PHASE_ROLLOVER_ALIAS);
                        setPhaseData(PHASE_ROLLOVER_ALIAS, e.target.value);
                      }}
                    />
                  </ErrableFormRow>
                </EuiFlexItem>
              </EuiFlexGroup> */}
              <EuiFlexGroup>
                <EuiFlexItem style={{ maxWidth: 188 }}>
                  <ErrableFormRow
                    label="Maximum size stored"
                    errorKey={PHASE_ROLLOVER_MAX_SIZE_STORED}
                    isShowingErrors={isShowingErrors}
                    errors={errors}
                  >
                    <EuiFieldNumber
                      value={phaseData[PHASE_ROLLOVER_MAX_SIZE_STORED]}
                      onChange={async e => {
                        await setPhaseData(
                          PHASE_ROLLOVER_MAX_SIZE_STORED,
                          e.target.value
                        );
                        validate();
                      }}
                    />
                  </ErrableFormRow>
                </EuiFlexItem>
                <EuiFlexItem style={{ maxWidth: 188 }}>
                  <ErrableFormRow
                    hasEmptyLabelSpace
                    errorKey={PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS}
                    isShowingErrors={isShowingErrors}
                    errors={errors}
                  >
                    <EuiSelect
                      value={phaseData[PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS]}
                      onChange={async e => {
                        await setPhaseData(
                          PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS,
                          e.target.value
                        );
                        validate();
                      }}
                      options={[
                        { value: 'gb', text: 'gigabytes' },
                        { value: MAX_SIZE_TYPE_DOCUMENT, text: 'documents' }
                      ]}
                    />
                  </ErrableFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer />
              <EuiFlexGroup>
                <EuiFlexItem style={{ maxWidth: 188 }}>
                  <ErrableFormRow
                    label="Maximum age"
                    errorKey={PHASE_ROLLOVER_MAX_AGE}
                    isShowingErrors={isShowingErrors}
                    errors={errors}
                  >
                    <EuiFieldNumber
                      value={phaseData[PHASE_ROLLOVER_MAX_AGE]}
                      onChange={async e => {
                        await setPhaseData(PHASE_ROLLOVER_MAX_AGE, e.target.value);
                        validate();
                      }}
                    />
                  </ErrableFormRow>
                </EuiFlexItem>
                <EuiFlexItem style={{ maxWidth: 188 }}>
                  <ErrableFormRow
                    hasEmptyLabelSpace
                    errorKey={PHASE_ROLLOVER_MAX_AGE_UNITS}
                    isShowingErrors={isShowingErrors}
                    errors={errors}
                  >
                    <EuiSelect
                      value={phaseData[PHASE_ROLLOVER_MAX_AGE_UNITS]}
                      onChange={async e => {
                        await setPhaseData(
                          PHASE_ROLLOVER_MAX_AGE_UNITS,
                          e.target.value
                        );
                        validate();
                      }}
                      options={[
                        { value: 'd', text: 'days' },
                        { value: 'h', text: 'hours' }
                      ]}
                    />
                  </ErrableFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </Fragment>
          ) : null}
        </div>
      </EuiAccordion>
    );
  }
}
