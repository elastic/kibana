/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FunctionComponent, useEffect, useState } from 'react';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiDescribedFormGroup,
  EuiCallOut,
} from '@elastic/eui';

import { Phases } from '../../../../../../../common/types';

import {
  useFormContext,
  useFormData,
  UseField,
  SelectField,
  ToggleField,
  NumericField,
} from '../../../../../../shared_imports';

import { ROLLOVER_EMPTY_VALIDATION } from '../../../form_validations';

import { ROLLOVER_FORM_PATHS } from '../../../constants';

import { LearnMoreLink, ActiveBadge, PhaseErrorMessage } from '../../';

import { Forcemerge, SetPriorityInput } from '../shared';

import { maxSizeStoredUnits, maxAgeUnits } from './constants';

import { i18nTexts } from './i18n_texts';

import { useRolloverPath } from '../shared';

const hotProperty: keyof Phases = 'hot';

export const HotPhase: FunctionComponent<{ setWarmPhaseOnRollover: (v: boolean) => void }> = ({
  setWarmPhaseOnRollover,
}) => {
  const form = useFormContext();
  const [formData] = useFormData({
    watch: useRolloverPath,
  });
  const isRolloverEnabled = get(formData, useRolloverPath);

  const isShowingErrors = form.isValid === false;
  const [showEmptyRolloverFieldsError, setShowEmptyRolloverFieldsError] = useState(false);

  useEffect(() => {
    setWarmPhaseOnRollover(isRolloverEnabled ?? false);
  }, [setWarmPhaseOnRollover, isRolloverEnabled]);

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
          component={ToggleField}
          componentProps={{
            hasEmptyLabelSpace: true,
            fullWidth: false,
            helpText: (
              <>
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
              </>
            ),
            euiFieldProps: {
              'data-test-subj': 'rolloverSwitch',
            },
          }}
        />
        {isRolloverEnabled && (
          <>
            <EuiSpacer size="m" />
            {showEmptyRolloverFieldsError && (
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
                <UseField path={ROLLOVER_FORM_PATHS.maxSize}>
                  {(field) => {
                    const showErrorCallout = field.errors.some(
                      (e) => e.validationType === ROLLOVER_EMPTY_VALIDATION
                    );
                    if (showErrorCallout !== showEmptyRolloverFieldsError) {
                      setShowEmptyRolloverFieldsError(showErrorCallout);
                    }
                    return (
                      <NumericField
                        field={field}
                        euiFieldProps={{
                          'data-test-subj': `${hotProperty}-selectedMaxSizeStored`,
                          min: 1,
                        }}
                      />
                    );
                  }}
                </UseField>
              </EuiFlexItem>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <UseField
                  key="_meta.hot.maxStorageSizeUnit"
                  path="_meta.hot.maxStorageSizeUnit"
                  component={SelectField}
                  componentProps={{
                    'data-test-subj': `${hotProperty}-selectedMaxSizeStoredUnits`,
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
                <UseField
                  path={ROLLOVER_FORM_PATHS.maxDocs}
                  component={NumericField}
                  componentProps={{
                    euiFieldProps: {
                      'data-test-subj': `${hotProperty}-selectedMaxDocuments`,
                      min: 1,
                    },
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            <EuiFlexGroup>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <UseField
                  path={ROLLOVER_FORM_PATHS.maxAge}
                  component={NumericField}
                  componentProps={{
                    euiFieldProps: {
                      'data-test-subj': `${hotProperty}-selectedMaxAge`,
                      min: 1,
                    },
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <UseField
                  key="_meta.hot.maxAgeUnit"
                  path="_meta.hot.maxAgeUnit"
                  component={SelectField}
                  componentProps={{
                    'data-test-subj': `${hotProperty}-selectedMaxAgeUnits`,
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
        )}
      </EuiDescribedFormGroup>
      {isRolloverEnabled && <Forcemerge phase="hot" />}
      <SetPriorityInput phase={hotProperty} />
    </>
  );
};
