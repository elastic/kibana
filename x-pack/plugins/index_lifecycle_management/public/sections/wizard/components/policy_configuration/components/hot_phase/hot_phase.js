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
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiFieldNumber,
  EuiSelect,
  EuiSwitch,
  EuiLink,
  EuiFormRow,
  EuiDescribedFormGroup,
  EuiBetaBadge,
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
      <EuiDescribedFormGroup
        title={
          <div>
            <span className="eui-displayInlineBlock eui-alignMiddle">Hot phase</span>{' '}
            <EuiBetaBadge label="Enabled" iconType="check" className="eui-alignMiddle" />
          </div>
        }
        titleSize="s"
        description={
          <Fragment>
            <p>
              This phase is required. Your index is being queried and actively written to.
              You can optimize this phase for write throughput.
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
        <EuiFormRow
          hasEmptyLabelSpace
          helpText={
            <p>
              If true, rollover the index when it gets too big or too old. The alias switches to the new index.{' '}
              <EuiLink href="https://www.elastic.co/guide/en/elasticsearch/reference/master/indices-rollover-index.html">
                Learn more
              </EuiLink>
            </p>
          }
        >
          <EuiSwitch
            checked={phaseData[PHASE_ROLLOVER_ENABLED]}
            onChange={async e => {
              await setPhaseData(PHASE_ROLLOVER_ENABLED, e.target.checked);
              validate();
            }}
            label="Enable rollover"
          />
        </EuiFormRow>
        {phaseData[PHASE_ROLLOVER_ENABLED] ? (
          <Fragment>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <ErrableFormRow
                  label="Maximum index size"
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
      </EuiDescribedFormGroup>
    );
  }
}
