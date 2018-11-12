/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import React, { PureComponent, Fragment } from 'react';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import PropTypes from 'prop-types';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiFormRow,
  EuiFieldNumber,
  EuiSelect,
  EuiDescribedFormGroup,
  EuiButton,
} from '@elastic/eui';
import {
  PHASE_DELETE,
  PHASE_ENABLED,
  PHASE_ROLLOVER_MINIMUM_AGE,
  PHASE_ROLLOVER_MINIMUM_AGE_UNITS,
} from '../../../../store/constants';
import { ErrableFormRow } from '../../form_errors';
import { ActiveBadge, PhaseErrorMessage } from '../../../../components';

class DeletePhaseUi extends PureComponent {
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
      isShowingErrors,
      intl
    } = this.props;

    return (
      <EuiDescribedFormGroup
        title={
          <div>
            <span className="eui-displayInlineBlock eui-alignMiddle">
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.deletePhaseLabel"
                defaultMessage="Delete phase"
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
                id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.deletePhaseDescriptionText"
                defaultMessage="Use this phase to define how long to retain your data."
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
                  id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.deactivateDeletePhaseButton"
                  defaultMessage="Deactivate delete phase"
                />
              </EuiButton>
            </div>

            <EuiSpacer size="m" />
            <EuiTitle size="s">
              <p>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.configurationTitle"
                  defaultMessage="Configuration"
                />
              </p>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <ErrableFormRow
                  id={`${PHASE_DELETE}.${PHASE_ROLLOVER_MINIMUM_AGE}`}
                  label={intl.formatMessage({
                    id: 'xpack.indexLifecycleMgmt.coldPhase.moveToDeletePhaseAfterLabel',
                    defaultMessage: 'Delete indices after'
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
                        id: 'xpack.indexLifecycleMgmt.deletePhase.daysLabel',
                        defaultMessage: 'days'
                      }) },
                      { value: 'h', text: intl.formatMessage({
                        id: 'xpack.indexLifecycleMgmt.deletePhase.hoursLabel',
                        defaultMessage: 'hours'
                      }) },
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
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.activateDeletePhaseButton"
                defaultMessage="Activate delete phase"
              />
            </EuiButton>
          </div>
        )}
      </EuiDescribedFormGroup>
    );
  }
}
export const DeletePhase = injectI18n(DeletePhaseUi);
