/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiFieldNumber,
  EuiSwitch,
  EuiFormRow,
  EuiDescribedFormGroup,
  EuiCallOut,
} from '@elastic/eui';

import { HotPhase as HotPhaseInterface, Phases } from '../../../../../../../common/types';

import {
  useFormContext,
  useFormData,
  UseField,
  SelectField,
  UseMultiFields,
  FieldConfig,
  getFieldValidityAndErrorMessage,
} from '../../../../../../shared_imports';

import { LearnMoreLink, ActiveBadge, PhaseErrorMessage, ErrableFormRow } from '../../';

import { Forcemerge, SetPriorityInput, ifExistsNumberGreaterThanZero } from '../shared';

import { maxSizeStoredUnits, maxAgeUnits, ROLLOVER_FORM_PATHS } from './constants';

import { ROLLOVER_EMPTY_VALIDATION, rolloverThresholdsValidator } from './validations';

import { i18nTexts } from './i18n_texts';

import { useRolloverPath } from '../shared';

const hotProperty: keyof Phases = 'hot';
const phaseProperty = (propertyName: keyof HotPhaseInterface) => propertyName;

const fieldsConfig = {
  _meta: {
    hot: {
      useRollover: {
        defaultValue: true,
      } as FieldConfig<boolean>,
      maxStorageSizeUnit: {
        defaultValue: 'gb',
      } as FieldConfig<string>,
      maxAgeUnit: {
        defaultValue: 'd',
      } as FieldConfig<string>,
    },
  },
  rollover: {
    maxStorageSize: {
      defaultValue: '50',
      label: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.maximumIndexSizeLabel', {
        defaultMessage: 'Maximum index size',
      }),
      validations: [
        {
          validator: rolloverThresholdsValidator,
        },
        {
          validator: ifExistsNumberGreaterThanZero,
        },
      ],
    } as FieldConfig<string>,
    maxDocs: {
      label: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.maximumDocumentsLabel', {
        defaultMessage: 'Maximum documents',
      }),
      validations: [
        {
          validator: rolloverThresholdsValidator,
        },
        {
          validator: ifExistsNumberGreaterThanZero,
        },
      ],
      serializer: (v: string): any => (v ? parseInt(v, 10) : undefined),
    } as FieldConfig<string>,
    maxAge: {
      defaultValue: '30',
      label: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.maximumAgeLabel', {
        defaultMessage: 'Maximum age',
      }),
      validations: [
        {
          validator: rolloverThresholdsValidator,
        },
        {
          validator: ifExistsNumberGreaterThanZero,
        },
      ],
    } as FieldConfig<string>,
  },
};

export const HotPhase: FunctionComponent = () => {
  const [{ [useRolloverPath]: isRolloverEnabled }] = useFormData({ watch: [useRolloverPath] });
  const form = useFormContext();
  const isShowingErrors = form.isValid === false;

  return (
    <>
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
        <UseField<boolean>
          key="_meta.hot.useRollover"
          path="_meta.hot.useRollover"
          config={fieldsConfig._meta.hot.useRollover}
        >
          {(field) => {
            return (
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
                  checked={field.value}
                  onChange={(e) => {
                    field.setValue(e.target.checked);
                  }}
                  label={i18n.translate('xpack.indexLifecycleMgmt.hotPhase.enableRolloverLabel', {
                    defaultMessage: 'Enable rollover',
                  })}
                />
              </EuiFormRow>
            );
          }}
        </UseField>
        {isRolloverEnabled && (
          <Fragment>
            <EuiSpacer size="m" />
            <UseMultiFields
              fields={{
                maxAge: {
                  path: ROLLOVER_FORM_PATHS.maxAge,
                  config: fieldsConfig.rollover.maxAge,
                },
                maxSize: {
                  path: ROLLOVER_FORM_PATHS.maxSize,
                  config: fieldsConfig.rollover.maxStorageSize,
                },
                maxDocs: {
                  path: ROLLOVER_FORM_PATHS.maxDocs,
                  config: fieldsConfig.rollover.maxDocs,
                },
              }}
            >
              {({ maxAge, maxSize, maxDocs }) => {
                const maxAgeValidity = getFieldValidityAndErrorMessage(maxAge);
                const maxSizeValidity = getFieldValidityAndErrorMessage(maxSize);
                const maxDocsValidity = getFieldValidityAndErrorMessage(maxDocs);
                return (
                  <>
                    {maxAge.errors.some((e) => e.validationType === ROLLOVER_EMPTY_VALIDATION) && (
                      <>
                        <EuiCallOut
                          title={i18nTexts.rollOverConfigurationCallout.title}
                          data-test-subj="rolloverSettingsRequired"
                          color="danger"
                        >
                          <div>{i18nTexts.rollOverConfigurationCallout.body}</div>
                        </EuiCallOut>
                        <EuiSpacer size="s" />
                      </>
                    )}
                    <EuiFlexGroup>
                      <EuiFlexItem style={{ maxWidth: 188 }}>
                        <ErrableFormRow
                          label={maxSize.label}
                          isShowingErrors={maxSizeValidity.isInvalid}
                          errors={maxSizeValidity.errorMessage}
                        >
                          <EuiFieldNumber
                            data-test-subj={`${hotProperty}-${phaseProperty(
                              'selectedMaxSizeStored'
                            )}`}
                            value={maxSize.value}
                            onChange={(e) => {
                              maxSize.setValue(e.target.value);
                            }}
                            min={1}
                          />
                        </ErrableFormRow>
                      </EuiFlexItem>
                      <EuiFlexItem style={{ maxWidth: 188 }}>
                        <UseField
                          key="_meta.hot.maxStorageSizeUnit"
                          path="_meta.hot.maxStorageSizeUnit"
                          component={SelectField}
                          config={fieldsConfig._meta.hot.maxStorageSizeUnit}
                          componentProps={{
                            'data-test-subj': `${hotProperty}-${phaseProperty(
                              'selectedMaxSizeStoredUnits'
                            )}`,
                            hasEmptyLabelSpace: true,
                            euiFieldProps: {
                              options: maxSizeStoredUnits,
                              'aria-label': i18n.translate(
                                'xpack.indexLifecycleMgmt.hotPhase.maximumIndexSizeUnitsAriaLabel',
                                {
                                  defaultMessage: 'Maximum index size units',
                                }
                              ),
                            },
                          }}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer />
                    <EuiFlexGroup>
                      <EuiFlexItem style={{ maxWidth: 188 }}>
                        <ErrableFormRow
                          label={maxDocs.label}
                          isShowingErrors={maxDocsValidity.isInvalid}
                          errors={maxDocsValidity.errorMessage}
                        >
                          <EuiFieldNumber
                            data-test-subj={`${hotProperty}-${phaseProperty(
                              'selectedMaxDocuments'
                            )}`}
                            value={maxDocs.value}
                            onChange={(e) => {
                              maxDocs.setValue(e.target.value);
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
                          label={maxAge.label}
                          isShowingErrors={maxAgeValidity.isInvalid}
                          errors={maxAgeValidity.errorMessage}
                        >
                          <EuiFieldNumber
                            data-test-subj={`${hotProperty}-${phaseProperty('selectedMaxAge')}`}
                            value={maxAge.value}
                            onChange={(e) => {
                              maxAge.setValue(e.target.value);
                            }}
                            min={1}
                          />
                        </ErrableFormRow>
                      </EuiFlexItem>
                      <EuiFlexItem style={{ maxWidth: 188 }}>
                        <UseField
                          key="_meta.hot.maxAgeUnit"
                          path="_meta.hot.maxAgeUnit"
                          config={fieldsConfig._meta.hot.maxAgeUnit}
                          component={SelectField}
                          componentProps={{
                            'data-test-subj': `${hotProperty}-${phaseProperty(
                              'selectedMaxAgeUnits'
                            )}`,
                            hasEmptyLabelSpace: true,
                            euiFieldProps: {
                              'aria-label': i18n.translate(
                                'xpack.indexLifecycleMgmt.hotPhase.maximumAgeUnitsAriaLabel',
                                {
                                  defaultMessage: 'Maximum age units',
                                }
                              ),
                              options: maxAgeUnits,
                            },
                          }}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </>
                );
              }}
            </UseMultiFields>
          </Fragment>
        )}
      </EuiDescribedFormGroup>
      {isRolloverEnabled && <Forcemerge phase="hot" />}
      <SetPriorityInput phase={hotProperty} />
    </>
  );
};
