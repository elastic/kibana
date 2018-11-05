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
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiFormRow,
  EuiFieldNumber,
  EuiSelect,
  EuiDescribedFormGroup,
  EuiBadge,
  EuiButton,
} from '@elastic/eui';
import {
  PHASE_DELETE,
  PHASE_ENABLED,
  PHASE_ROLLOVER_MINIMUM_AGE,
  PHASE_ROLLOVER_MINIMUM_AGE_UNITS,
} from '../../../../store/constants';
import { ErrableFormRow } from '../../form_errors';

export class DeletePhase extends PureComponent {
  static propTypes = {
    setPhaseData: PropTypes.func.isRequired,
    isShowingErrors: PropTypes.bool.isRequired,
    errors: PropTypes.object.isRequired,
    phaseData: PropTypes.shape({
      [PHASE_ENABLED]: PropTypes.bool.isRequired,
      [PHASE_ROLLOVER_MINIMUM_AGE]: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string
      ]).isRequired,
      [PHASE_ROLLOVER_MINIMUM_AGE_UNITS]: PropTypes.string.isRequired
    }).isRequired
  };

  render() {
    const {
      setPhaseData,
      phaseData,
      errors,
      isShowingErrors
    } = this.props;

    return (
      <EuiDescribedFormGroup
        title={
          <div>
            <span className="eui-displayInlineBlock eui-alignMiddle">Delete phase</span>{' '}
            {phaseData[PHASE_ENABLED] ? (
              <EuiBadge className="eui-alignMiddle">Active</EuiBadge>
            ) : null}
          </div>
        }
        titleSize="s"
        description={
          <Fragment>
            <p>
              Use this phase to define how long to retain your data.
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
                }}
              >
                Deactive delete phase
              </EuiButton>
            </div>

            <EuiSpacer size="m" />
            <EuiTitle size="s">
              <p>Configuration</p>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <ErrableFormRow
                  id={`${PHASE_DELETE}.${PHASE_ROLLOVER_MINIMUM_AGE}`}
                  label="Delete indices after"
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
                      { value: 'd', text: 'days' },
                      { value: 'h', text: 'hours' },
                    ]}
                  />
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
              Activate delete phase
            </EuiButton>
          </div>
        )}
      </EuiDescribedFormGroup>
    );
  }
}
