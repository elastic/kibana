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
  EuiSelect,
  EuiSwitch,
  EuiFormRow,
  EuiDescribedFormGroup,
} from '@elastic/eui';

import {
  HotPhase as HotPhaseInterface,
  Phases,
  SerializedHotPhase,
} from '../../../../../common/types';
import { useForm, Form, useFormData, UseField, FieldConfig } from '../../../../shared_imports';
import { PhaseValidationErrors } from '../../../services/policies/policy_validation';

import {
  LearnMoreLink,
  ActiveBadge,
  PhaseErrorMessage,
  ErrableFormRow,
  SetPriorityInput,
  Forcemerge,
} from '../components';

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

const meta = {
  useRollover: {
    defaultValue: true,
  } as FieldConfig<boolean>,
};

interface Props {
  errors?: PhaseValidationErrors<HotPhaseInterface>;
  defaultValue?: SerializedHotPhase;
  isShowingErrors: boolean;
  phaseData: HotPhaseInterface;
  setPhaseData: (key: keyof HotPhaseInterface & string, value: string | boolean) => void;
  setWarmPhaseOnRollover: (value: boolean) => void;
}

const deserializer = (phase: SerializedHotPhase) => {
  return {
    _meta: {
      useRollover: Boolean(phase.actions.rollover),
    },
    ...phase,
  };
};

const serializer = (out: any) => {
  const { _meta, ...rest } = out;
  return rest;
};

const defaultHotPhase: SerializedHotPhase = {
  actions: {
    rollover: {},
  },
};

export const HotPhase: FunctionComponent<Props> = ({
  defaultValue,
  setPhaseData,
  phaseData,
  errors,
  setWarmPhaseOnRollover,
}) => {
  const { form } = useForm({
    defaultValue: defaultValue ?? defaultHotPhase,
    deserializer,
    serializer,
  });
  const [formData] = useFormData({ form });
  const isShowingErrors = form.isValid === false;
  const isRolloverEnabled = !!formData['_meta.useRollover'];
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
        <UseField<boolean> path="_meta.useRollover" config={meta.useRollover}>
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
            <EuiFlexGroup>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <ErrableFormRow
                  id={`${hotProperty}-${phaseProperty('selectedMaxSizeStored')}`}
                  label={i18n.translate('xpack.indexLifecycleMgmt.hotPhase.maximumIndexSizeLabel', {
                    defaultMessage: 'Maximum index size',
                  })}
                  isShowingErrors={isShowingErrors}
                  errors={errors?.selectedMaxSizeStored}
                >
                  <EuiFieldNumber
                    id={`${hotProperty}-${phaseProperty('selectedMaxSizeStored')}`}
                    value={phaseData.selectedMaxSizeStored}
                    onChange={(e) => {
                      setPhaseData(phaseProperty('selectedMaxSizeStored'), e.target.value);
                    }}
                    min={1}
                  />
                </ErrableFormRow>
              </EuiFlexItem>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <ErrableFormRow
                  id={`${hotProperty}-${phaseProperty('selectedMaxSizeStoredUnits')}`}
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
                      setPhaseData(phaseProperty('selectedMaxSizeStoredUnits'), e.target.value);
                    }}
                    options={maxSizeStoredUnits}
                  />
                </ErrableFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            <EuiFlexGroup>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <ErrableFormRow
                  id={`${hotProperty}-${phaseProperty('selectedMaxDocuments')}`}
                  label={i18n.translate('xpack.indexLifecycleMgmt.hotPhase.maximumDocumentsLabel', {
                    defaultMessage: 'Maximum documents',
                  })}
                  isShowingErrors={isShowingErrors}
                  errors={errors?.selectedMaxDocuments}
                >
                  <EuiFieldNumber
                    id={`${hotProperty}-${phaseProperty('selectedMaxDocuments')}`}
                    value={phaseData.selectedMaxDocuments}
                    onChange={(e) => {
                      setPhaseData(phaseProperty('selectedMaxDocuments'), e.target.value);
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
                  id={`${hotProperty}-${phaseProperty('selectedMaxAge')}`}
                  label={i18n.translate('xpack.indexLifecycleMgmt.hotPhase.maximumAgeLabel', {
                    defaultMessage: 'Maximum age',
                  })}
                  isShowingErrors={isShowingErrors}
                  errors={errors?.selectedMaxAge}
                >
                  <EuiFieldNumber
                    id={`${hotProperty}-${phaseProperty('selectedMaxAge')}`}
                    value={phaseData.selectedMaxAge}
                    onChange={(e) => {
                      setPhaseData(phaseProperty('selectedMaxAge'), e.target.value);
                    }}
                    min={1}
                  />
                </ErrableFormRow>
              </EuiFlexItem>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <ErrableFormRow
                  id={`${hotProperty}-${phaseProperty('selectedMaxAgeUnits')}`}
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
                      setPhaseData(phaseProperty('selectedMaxAgeUnits'), e.target.value);
                    }}
                    options={maxAgeUnits}
                  />
                </ErrableFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </Fragment>
        )}
      </EuiDescribedFormGroup>
      {isRolloverEnabled && (
        <Forcemerge
          phase={'hot'}
          phaseData={phaseData}
          setPhaseData={setPhaseData}
          isShowingErrors={isShowingErrors}
          errors={errors}
        />
      )}
      <SetPriorityInput<HotPhaseInterface>
        errors={errors}
        phaseData={phaseData}
        phase={hotProperty}
        isShowingErrors={isShowingErrors}
        setPhaseData={setPhaseData}
      />
    </Form>
  );
};
