/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, PureComponent } from 'react';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import PropTypes from 'prop-types';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiFieldNumber,
  EuiSelect,
  EuiSwitch,
  EuiFormRow,
  EuiDescribedFormGroup,
} from '@elastic/eui';
import { LearnMoreLink, ActiveBadge, PhaseErrorMessage } from '../../../components';
import {
  PHASE_HOT,
  PHASE_ROLLOVER_ALIAS,
  PHASE_ROLLOVER_MAX_AGE,
  PHASE_ROLLOVER_MAX_AGE_UNITS,
  PHASE_ROLLOVER_MAX_SIZE_STORED,
  PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS,
  PHASE_ROLLOVER_ENABLED,
  MAX_SIZE_TYPE_DOCUMENT
} from '../../../../store/constants';

import { ErrableFormRow } from '../../form_errors';

class HotPhaseUi extends PureComponent {
  static propTypes = {
    setPhaseData: PropTypes.func.isRequired,

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
      setPhaseData,
      phaseData,
      isShowingErrors,
      errors,
      intl,
      setWarmPhaseOnRollover
    } = this.props;

    return (
      <EuiDescribedFormGroup
        title={
          <div>
            <span className="eui-displayInlineBlock eui-alignMiddle">
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.hotPhase.hotPhaseLabel"
                defaultMessage="Hot phase"
              />
            </span>{' '}
            {isShowingErrors ? null : <ActiveBadge />}
            <PhaseErrorMessage isShowingErrors={isShowingErrors} />
          </div>
        }
        titleSize="s"
        description={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.hotPhase.hotPhaseDescriptionMessage"
                defaultMessage="This phase is required. You are actively querying and writing to your
                index. For faster updates, you can roll over the index when it gets too big or too old."
              />
            </p>
          </Fragment>
        }
        fullWidth
      >
        <EuiFormRow
          id="rolloverFormRow"
          hasEmptyLabelSpace
          helpText={
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.hotPhase.rolloverDescriptionMessage"
                  defaultMessage="The new index created by rollover is added
                    to the index alias and designated as the write index."
                />
              </p>
              <LearnMoreLink
                text={
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.hotPhase.learnAboutRolloverLinkText"
                    defaultMessage="Learn about rollover"
                  />
                }
                docPath="indices-rollover-index.html"
              />
              <EuiSpacer size="m"/>
            </Fragment>
          }
        >
          <EuiSwitch
            data-test-subj="rolloverSwitch"
            checked={phaseData[PHASE_ROLLOVER_ENABLED]}
            onChange={async e => {
              const { checked } = e.target;
              setPhaseData(PHASE_ROLLOVER_ENABLED, checked);
              setWarmPhaseOnRollover(checked);
            }}
            label={intl.formatMessage({
              id: 'xpack.indexLifecycleMgmt.hotPhase.enableRolloverLabel',
              defaultMessage: 'Enable rollover'
            })}
          />
        </EuiFormRow>
        {phaseData[PHASE_ROLLOVER_ENABLED] ? (
          <Fragment>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <ErrableFormRow
                  id={`${PHASE_HOT}-${PHASE_ROLLOVER_MAX_SIZE_STORED}`}
                  label={intl.formatMessage({
                    id: 'xpack.indexLifecycleMgmt.hotPhase.maximumIndexSizeLabel',
                    defaultMessage: 'Maximum index size'
                  })}
                  errorKey={PHASE_ROLLOVER_MAX_SIZE_STORED}
                  isShowingErrors={isShowingErrors}
                  errors={errors}
                >
                  <EuiFieldNumber
                    id={`${PHASE_HOT}-${PHASE_ROLLOVER_MAX_SIZE_STORED}`}
                    value={phaseData[PHASE_ROLLOVER_MAX_SIZE_STORED]}
                    onChange={async e => {
                      await setPhaseData(
                        PHASE_ROLLOVER_MAX_SIZE_STORED,
                        e.target.value
                      );
                    }}
                    min={1}
                  />
                </ErrableFormRow>
              </EuiFlexItem>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <ErrableFormRow
                  id={`${PHASE_HOT}-${PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS}`}
                  hasEmptyLabelSpace
                  errorKey={PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS}
                  isShowingErrors={isShowingErrors}
                  errors={errors}
                >
                  <EuiSelect
                    aria-label={intl.formatMessage({
                      id: 'xpack.indexLifecycleMgmt.hotPhase.maximumIndexSizeUnitsAriaLabel',
                      defaultMessage: 'Maximum index size units'
                    })}
                    value={phaseData[PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS]}
                    onChange={async e => {
                      await setPhaseData(
                        PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS,
                        e.target.value
                      );
                    }}
                    options={[
                      { value: 'gb', text: intl.formatMessage({
                        id: 'xpack.indexLifecycleMgmt.hotPhase.gigabytesLabel',
                        defaultMessage: 'gigabytes'
                      }) },
                      { value: MAX_SIZE_TYPE_DOCUMENT, text: intl.formatMessage({
                        id: 'xpack.indexLifecycleMgmt.hotPhase.documentsLabel',
                        defaultMessage: 'documents'
                      }) }
                    ]}
                  />
                </ErrableFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            <EuiFlexGroup>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <ErrableFormRow
                  id={`${PHASE_HOT}-${PHASE_ROLLOVER_MAX_AGE}`}
                  label={intl.formatMessage({
                    id: 'xpack.indexLifecycleMgmt.hotPhase.maximumAgeLabel',
                    defaultMessage: 'Maximum age'
                  })}
                  errorKey={`${PHASE_ROLLOVER_MAX_AGE}`}
                  isShowingErrors={isShowingErrors}
                  errors={errors}
                >
                  <EuiFieldNumber
                    id={`${PHASE_HOT}-${PHASE_ROLLOVER_MAX_AGE}`}
                    value={phaseData[PHASE_ROLLOVER_MAX_AGE]}
                    onChange={async e => {
                      await setPhaseData(PHASE_ROLLOVER_MAX_AGE, e.target.value);
                    }}
                    min={1}
                  />
                </ErrableFormRow>
              </EuiFlexItem>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <ErrableFormRow
                  id={`${PHASE_HOT}-${PHASE_ROLLOVER_MAX_AGE_UNITS}`}
                  hasEmptyLabelSpace
                  errorKey={PHASE_ROLLOVER_MAX_AGE_UNITS}
                  isShowingErrors={isShowingErrors}
                  errors={errors}
                >
                  <EuiSelect
                    aria-label={intl.formatMessage({
                      id: 'xpack.indexLifecycleMgmt.hotPhase.maximumAgeUnitsAriaLabel',
                      defaultMessage: 'Maximum age units'
                    })}
                    value={phaseData[PHASE_ROLLOVER_MAX_AGE_UNITS]}
                    onChange={async e => {
                      await setPhaseData(
                        PHASE_ROLLOVER_MAX_AGE_UNITS,
                        e.target.value
                      );
                    }}
                    options={[
                      { value: 'd', text: intl.formatMessage({
                        id: 'xpack.indexLifecycleMgmt.hotPhase.daysLabel',
                        defaultMessage: 'days'
                      }) },
                      { value: 'h', text: intl.formatMessage({
                        id: 'xpack.indexLifecycleMgmt.hotPhase.hoursLabel',
                        defaultMessage: 'hours'
                      }) },
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
export const HotPhase = injectI18n(HotPhaseUi);
