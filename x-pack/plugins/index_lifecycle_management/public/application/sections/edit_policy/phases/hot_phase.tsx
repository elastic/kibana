/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, PureComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
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
import { HotPhase as HotPhaseInterface, Phases } from '../../../services/policies/types';

import {
  LearnMoreLink,
  ActiveBadge,
  PhaseErrorMessage,
  ErrableFormRow,
  SetPriorityInput,
} from '../components';
import { PhaseValidationErrors, propertyof } from '../../../services/policies/policy_validation';

interface Props {
  errors?: PhaseValidationErrors<HotPhaseInterface>;
  isShowingErrors: boolean;
  phaseData: HotPhaseInterface;
  setPhaseData: (key: keyof HotPhaseInterface & string, value: string | boolean) => void;
  setWarmPhaseOnRollover: (value: boolean) => void;
}

export class HotPhase extends PureComponent<Props> {
  render() {
    const { setPhaseData, phaseData, isShowingErrors, errors, setWarmPhaseOnRollover } = this.props;

    const hotPhaseProperty = propertyof<Phases>('hot');
    const selectedMaxSizeStoredProperty = propertyof<HotPhaseInterface>('selectedMaxSizeStored');
    const selectedMaxSizeStoredUnitsProperty = propertyof<HotPhaseInterface>(
      'selectedMaxSizeStoredUnits'
    );
    const selectedMaxDocumentsProperty = propertyof<HotPhaseInterface>('selectedMaxDocuments');
    const selectedMaxAgeProperty = propertyof<HotPhaseInterface>('selectedMaxAge');
    const selectedMaxAgeUnitsProperty = propertyof<HotPhaseInterface>('selectedMaxAgeUnits');

    return (
      <Fragment>
        <EuiDescribedFormGroup
          title={
            <div>
              <h2 className="eui-displayInlineBlock eui-alignMiddle">
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.hotPhase.hotPhaseLabel"
                  defaultMessage="Hot phase"
                />
              </h2>{' '}
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
                  defaultMessage="This phase is required. You are actively querying and
                    writing to your index.  For faster updates, you can roll over the index when it gets too big or too old."
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
                <EuiSpacer size="m" />
              </Fragment>
            }
          >
            <EuiSwitch
              data-test-subj="rolloverSwitch"
              checked={phaseData.rolloverEnabled}
              onChange={async (e) => {
                setWarmPhaseOnRollover(e.target.checked);
              }}
              label={i18n.translate('xpack.indexLifecycleMgmt.hotPhase.enableRolloverLabel', {
                defaultMessage: 'Enable rollover',
              })}
            />
          </EuiFormRow>
          {phaseData.rolloverEnabled ? (
            <Fragment>
              <EuiSpacer size="m" />
              <EuiFlexGroup>
                <EuiFlexItem style={{ maxWidth: 188 }}>
                  <ErrableFormRow
                    id={`${hotPhaseProperty}-${selectedMaxSizeStoredProperty}`}
                    label={i18n.translate(
                      'xpack.indexLifecycleMgmt.hotPhase.maximumIndexSizeLabel',
                      {
                        defaultMessage: 'Maximum index size',
                      }
                    )}
                    isShowingErrors={isShowingErrors}
                    errors={errors?.selectedMaxSizeStored}
                  >
                    <EuiFieldNumber
                      id={`${hotPhaseProperty}-${selectedMaxSizeStoredProperty}`}
                      value={phaseData.selectedMaxSizeStored}
                      onChange={(e) => {
                        setPhaseData(selectedMaxSizeStoredProperty, e.target.value);
                      }}
                      min={1}
                    />
                  </ErrableFormRow>
                </EuiFlexItem>
                <EuiFlexItem style={{ maxWidth: 188 }}>
                  <ErrableFormRow
                    id={`${hotPhaseProperty}-${selectedMaxSizeStoredUnitsProperty}`}
                    hasEmptyLabelSpace
                    isShowingErrors={isShowingErrors}
                    errors={errors?.selectedMaxSizeStoredUnits}
                  >
                    <EuiSelect
                      aria-label={i18n.translate(
                        'xpack.indexLifecycleMgmt.hotPhase.maximumIndexSizeUnitsAriaLabel',
                        {
                          defaultMessage: 'Maximum index size units',
                        }
                      )}
                      value={phaseData.selectedMaxSizeStoredUnits}
                      onChange={(e) => {
                        setPhaseData(selectedMaxSizeStoredUnitsProperty, e.target.value);
                      }}
                      options={[
                        {
                          value: 'gb',
                          text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.gigabytesLabel', {
                            defaultMessage: 'gigabytes',
                          }),
                        },
                        {
                          value: 'mb',
                          text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.megabytesLabel', {
                            defaultMessage: 'megabytes',
                          }),
                        },
                        {
                          value: 'b',
                          text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.bytesLabel', {
                            defaultMessage: 'bytes',
                          }),
                        },
                        {
                          value: 'kb',
                          text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.kilobytesLabel', {
                            defaultMessage: 'kilobytes',
                          }),
                        },
                        {
                          value: 'tb',
                          text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.terabytesLabel', {
                            defaultMessage: 'terabytes',
                          }),
                        },
                        {
                          value: 'pb',
                          text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.petabytesLabel', {
                            defaultMessage: 'petabytes',
                          }),
                        },
                      ]}
                    />
                  </ErrableFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer />
              <EuiFlexGroup>
                <EuiFlexItem style={{ maxWidth: 188 }}>
                  <ErrableFormRow
                    id={`${hotPhaseProperty}-${selectedMaxDocumentsProperty}`}
                    label={i18n.translate(
                      'xpack.indexLifecycleMgmt.hotPhase.maximumDocumentsLabel',
                      {
                        defaultMessage: 'Maximum documents',
                      }
                    )}
                    isShowingErrors={isShowingErrors}
                    errors={errors?.selectedMaxDocuments}
                  >
                    <EuiFieldNumber
                      id={`${hotPhaseProperty}-${selectedMaxDocumentsProperty}`}
                      value={phaseData.selectedMaxDocuments}
                      onChange={(e) => {
                        setPhaseData(selectedMaxDocumentsProperty, e.target.value);
                      }}
                      min={1}
                    />
                  </ErrableFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer />
              <EuiFlexGroup>
                <EuiFlexItem style={{ maxWidth: 188 }}>
                  <ErrableFormRow
                    id={`${hotPhaseProperty}-${selectedMaxAgeProperty}`}
                    label={i18n.translate('xpack.indexLifecycleMgmt.hotPhase.maximumAgeLabel', {
                      defaultMessage: 'Maximum age',
                    })}
                    isShowingErrors={isShowingErrors}
                    errors={errors?.selectedMaxAge}
                  >
                    <EuiFieldNumber
                      id={`${hotPhaseProperty}-${selectedMaxAgeProperty}`}
                      value={phaseData.selectedMaxAge}
                      onChange={(e) => {
                        setPhaseData(selectedMaxAgeProperty, e.target.value);
                      }}
                      min={1}
                    />
                  </ErrableFormRow>
                </EuiFlexItem>
                <EuiFlexItem style={{ maxWidth: 188 }}>
                  <ErrableFormRow
                    id={`${hotPhaseProperty}-${selectedMaxAgeUnitsProperty}`}
                    hasEmptyLabelSpace
                    isShowingErrors={isShowingErrors}
                    errors={errors?.selectedMaxAgeUnits}
                  >
                    <EuiSelect
                      aria-label={i18n.translate(
                        'xpack.indexLifecycleMgmt.hotPhase.maximumAgeUnitsAriaLabel',
                        {
                          defaultMessage: 'Maximum age units',
                        }
                      )}
                      value={phaseData.selectedMaxAgeUnits}
                      onChange={(e) => {
                        setPhaseData(selectedMaxAgeUnitsProperty, e.target.value);
                      }}
                      options={[
                        {
                          value: 'd',
                          text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.daysLabel', {
                            defaultMessage: 'days',
                          }),
                        },
                        {
                          value: 'h',
                          text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.hoursLabel', {
                            defaultMessage: 'hours',
                          }),
                        },
                        {
                          value: 'm',
                          text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.minutesLabel', {
                            defaultMessage: 'minutes',
                          }),
                        },
                        {
                          value: 's',
                          text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.secondsLabel', {
                            defaultMessage: 'seconds',
                          }),
                        },
                        {
                          value: 'ms',
                          text: i18n.translate(
                            'xpack.indexLifecycleMgmt.hotPhase.millisecondsLabel',
                            {
                              defaultMessage: 'milliseconds',
                            }
                          ),
                        },
                        {
                          value: 'micros',
                          text: i18n.translate(
                            'xpack.indexLifecycleMgmt.hotPhase.microsecondsLabel',
                            {
                              defaultMessage: 'microseconds',
                            }
                          ),
                        },
                        {
                          value: 'nanos',
                          text: i18n.translate(
                            'xpack.indexLifecycleMgmt.hotPhase.nanosecondsLabel',
                            {
                              defaultMessage: 'nanoseconds',
                            }
                          ),
                        },
                      ]}
                    />
                  </ErrableFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </Fragment>
          ) : null}
        </EuiDescribedFormGroup>
        <SetPriorityInput<HotPhaseInterface>
          errors={errors}
          phaseData={phaseData}
          phase={hotPhaseProperty}
          isShowingErrors={isShowingErrors}
          setPhaseData={setPhaseData}
        />
      </Fragment>
    );
  }
}
