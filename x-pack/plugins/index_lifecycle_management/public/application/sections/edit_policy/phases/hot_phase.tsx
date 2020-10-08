/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FunctionComponent, useEffect } from 'react';
import { produce } from 'immer';
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

import {
  HotPhase as HotPhaseInterface,
  Phases,
  SerializedHotPhase,
} from '../../../../../common/types';

import {
  useForm,
  Form,
  useFormData,
  UseField,
  SelectField,
  UseMultiFields,
  FieldConfig,
  ValidationFunc,
  getFieldValidityAndErrorMessage,
} from '../../../../shared_imports';

import { splitSizeAndUnits } from '../../../services/policies/policy_serialization';

import { LearnMoreLink, ActiveBadge, PhaseErrorMessage, ErrableFormRow } from '../components';

import { Forcemerge, SetPriorityInput, ifExistsNumberGreatThanZero } from './shared';

const maxSizeStoredUnits = [
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
];

const maxAgeUnits = [
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
    text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.millisecondsLabel', {
      defaultMessage: 'milliseconds',
    }),
  },
  {
    value: 'micros',
    text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.microsecondsLabel', {
      defaultMessage: 'microseconds',
    }),
  },
  {
    value: 'nanos',
    text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.nanosecondsLabel', {
      defaultMessage: 'nanoseconds',
    }),
  },
];

const hotProperty: keyof Phases = 'hot';
const phaseProperty = (propertyName: keyof HotPhaseInterface) => propertyName;

const ROLLOVER_PATHS = {
  maxDocs: 'actions.rollover.max_docs',
  maxAge: 'actions.rollover.max_age',
  maxSize: 'actions.rollover.max_size',
};

const i18nTexts = {
  maximumAgeRequiredMessage: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.maximumAgeMissingError',
    {
      defaultMessage: 'A maximum age is required.',
    }
  ),
  maximumSizeRequiredMessage: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.maximumIndexSizeMissingError',
    {
      defaultMessage: 'A maximum index size is required.',
    }
  ),
  maximumDocumentsRequiredMessage: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.maximumDocumentsMissingError',
    {
      defaultMessage: 'Maximum documents is required.',
    }
  ),
  rollOverConfigurationCallout: {
    title: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.rolloverConfigurationError.title', {
      defaultMessage: 'Invalid rollover configuration',
    }),
    body: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.rolloverConfigurationError.body', {
      defaultMessage:
        'A value for one of maximum size, maximum documents, or maximum age is required.',
    }),
  },
};

const EMPTY = 'EMPTY';
const rolloverThresholdsValidator: ValidationFunc = ({ form }) => {
  const fields = form.getFields();
  if (
    !(
      fields[ROLLOVER_PATHS.maxAge].value ||
      fields[ROLLOVER_PATHS.maxDocs].value ||
      fields[ROLLOVER_PATHS.maxSize].value
    )
  ) {
    fields[ROLLOVER_PATHS.maxAge].setErrors([
      { validationType: EMPTY, message: i18nTexts.maximumAgeRequiredMessage },
    ]);
    fields[ROLLOVER_PATHS.maxDocs].setErrors([
      { validationType: EMPTY, message: i18nTexts.maximumDocumentsRequiredMessage },
    ]);
    fields[ROLLOVER_PATHS.maxSize].setErrors([
      { validationType: EMPTY, message: i18nTexts.maximumSizeRequiredMessage },
    ]);
  } else {
    fields[ROLLOVER_PATHS.maxAge].clearErrors(EMPTY);
    fields[ROLLOVER_PATHS.maxDocs].clearErrors(EMPTY);
    fields[ROLLOVER_PATHS.maxSize].clearErrors(EMPTY);
  }
};
const fieldsConfig = {
  _meta: {
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
  rollover: {
    maxStorageSize: {
      label: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.maximumIndexSizeLabel', {
        defaultMessage: 'Maximum index size',
      }),
      validations: [
        {
          validator: rolloverThresholdsValidator,
        },
        {
          validator: ifExistsNumberGreatThanZero,
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
          validator: ifExistsNumberGreatThanZero,
        },
      ],
      serializer: (v: string): any => (v ? parseInt(v, 10) : undefined),
    } as FieldConfig<string>,
    maxAge: {
      label: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.maximumAgeLabel', {
        defaultMessage: 'Maximum age',
      }),
      defaultValue: '30',
      validations: [
        {
          validator: rolloverThresholdsValidator,
        },
        {
          validator: ifExistsNumberGreatThanZero,
        },
      ],
    } as FieldConfig<string>,
  },
};

interface Props {
  defaultValue?: SerializedHotPhase;
  onChange: (formData: any) => void;
  setWarmPhaseOnRollover: (value: boolean) => void;
}

/**
 * Describes the shape of data after deserialization.
 */
export interface FormInternal extends SerializedHotPhase {
  /**
   * This is a special internal-only field that is used to display or hide
   * certain form fields which affects what is ultimately serialized.
   */
  _meta: {
    useRollover: boolean;
    forceMergeEnabled: boolean;
    bestCompression: boolean;
    maxStorageSizeUnit?: string;
    maxAgeUnit?: string;
  };
}

const deserializer = (phase: SerializedHotPhase): FormInternal =>
  produce(phase, (draft: SerializedHotPhase) => {
    const _meta: FormInternal['_meta'] = {
      useRollover: Boolean(draft.actions?.rollover),
      forceMergeEnabled: Boolean(draft.actions?.forcemerge),
      bestCompression: draft.actions?.forcemerge?.index_codec === 'best_compression',
    };

    if (draft.actions?.rollover) {
      if (draft.actions.rollover.max_size) {
        const maxSize = splitSizeAndUnits(draft.actions.rollover.max_size);
        draft.actions.rollover.max_size = maxSize.size;
        _meta.maxStorageSizeUnit = maxSize.units;
      }

      if (draft.actions.rollover.max_age) {
        const maxAge = splitSizeAndUnits(draft.actions.rollover.max_age);
        draft.actions.rollover.max_age = maxAge.size;
        _meta.maxAgeUnit = maxAge.units;
      }
    }

    return {
      _meta,
      ...draft,
    };
  });

const serializer = (data: FormInternal) => {
  const { _meta, ...rest } = data;
  if (rest.actions?.rollover) {
    if (rest.actions.rollover.max_size) {
      rest.actions.rollover.max_size = `${rest.actions.rollover.max_size}${_meta.maxStorageSizeUnit}`;
    }
    if (rest.actions.rollover.max_age) {
      rest.actions.rollover.max_age = `${rest.actions.rollover.max_age}${_meta.maxAgeUnit}`;
    }

    if (_meta.bestCompression && rest.actions.forcemerge) {
      rest.actions.forcemerge.index_codec = 'best_compression';
    }
  }
  return rest;
};

export const defaultHotPhase: SerializedHotPhase = {
  actions: {
    rollover: {},
  },
};

export const HotPhase: FunctionComponent<Props> = ({
  defaultValue,
  setWarmPhaseOnRollover,
  onChange,
}) => {
  const { form } = useForm({
    defaultValue: defaultValue ?? defaultHotPhase,
    deserializer,
    serializer,
  });
  const [formData] = useFormData({ form });
  const isShowingErrors = form.isValid === false;
  const isRolloverEnabled = !!formData['_meta.useRollover'];

  useEffect(() => {
    const subscription = form.subscribe(onChange);
    return subscription.unsubscribe;
  }, [onChange, form]);

  return (
    <Form form={form}>
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
        <UseField<boolean> path="_meta.useRollover" config={fieldsConfig._meta.useRollover}>
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
                    setWarmPhaseOnRollover(e.target.checked);
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
                  path: ROLLOVER_PATHS.maxAge,
                  config: fieldsConfig.rollover.maxAge,
                },
                maxSize: {
                  path: ROLLOVER_PATHS.maxSize,
                  config: fieldsConfig.rollover.maxStorageSize,
                },
                maxDocs: {
                  path: ROLLOVER_PATHS.maxDocs,
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
                    {maxAge.errors.some((e) => e.validationType === EMPTY) && (
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
                          data-test-subj={`${hotProperty}-${phaseProperty(
                            'selectedMaxSizeStored'
                          )}`}
                          label={maxSize.label}
                          isShowingErrors={maxSizeValidity.isInvalid}
                        >
                          <EuiFieldNumber
                            id={`${hotProperty}-${phaseProperty('selectedMaxSizeStored')}`}
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
                          path="_meta.maxStorageSizeUnit"
                          component={SelectField}
                          config={fieldsConfig._meta.maxStorageSizeUnit}
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
                          data-test-subj={`${hotProperty}-${phaseProperty('selectedMaxDocuments')}`}
                          label={maxDocs.label}
                          isShowingErrors={maxDocsValidity.isInvalid}
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
                          data-test-subj={`${hotProperty}-${phaseProperty('selectedMaxAge')}`}
                          label={maxAge.label}
                          isShowingErrors={maxAgeValidity.isInvalid}
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
                          path="_meta.maxAgeUnit"
                          config={fieldsConfig._meta.maxAgeUnit}
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
    </Form>
  );
};
