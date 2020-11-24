/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FunctionComponent, useState } from 'react';
import { EuiAccordion, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import {
  UseField,
  NumericField,
  SelectField,
  ToggleField,
  useFormData,
} from '../../../../../../../shared_imports';

import { i18nTexts } from '../../../../i18n_texts';
import { ROLLOVER_FORM_PATHS, useRolloverPath } from '../../../../constants';
import { ROLLOVER_EMPTY_VALIDATION } from '../../../../form';

import { DescribedFormField, LearnMoreLink } from '../../../';

import { maxAgeUnits, maxSizeStoredUnits } from '../constants';

import './_rollover_fields.scss';

const hasConfiguredRolloverPath = '_meta.hot.hasConfiguredRollover';

export const RolloverFields: FunctionComponent = () => {
  const [formData] = useFormData({
    watch: [hasConfiguredRolloverPath, useRolloverPath],
  });
  const isRolloverEnabled = get(formData, useRolloverPath);

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showEmptyRolloverFieldsError, setShowEmptyRolloverFieldsError] = useState(false);
  return (
    <EuiAccordion
      id="advancedSettingsRollover"
      buttonContent={showAdvancedSettings ? 'Hide advanced settings' : 'Show advanced settings'}
      onToggle={() => setShowAdvancedSettings}
      paddingSize="m"
    >
      <div className="ilmRolloverFields">
        <DescribedFormField
          title={<h3>Rollover</h3>}
          description={
            'Efficiently search and store timeseries data. Learn more about rollover. By default rollover is enabled and configured with the following thresholds: index size 50 gigabytes and maximum index age 30 days.'
          }
          switchProps={{
            path: hasConfiguredRolloverPath,
            label: 'Customize rollover',
          }}
          fullWidth
          keepChildrenMounted
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
                    title={i18nTexts.editPolicy.errors.rollOverConfigurationCallout.title}
                    data-test-subj="rolloverSettingsRequired"
                    color="danger"
                  >
                    <div>{i18nTexts.editPolicy.errors.rollOverConfigurationCallout.body}</div>
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
                            'data-test-subj': `hot-selectedMaxSizeStored`,
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
                      'data-test-subj': `hot-selectedMaxSizeStoredUnits`,
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
                        'data-test-subj': `hot-selectedMaxDocuments`,
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
                        'data-test-subj': `hot-selectedMaxAge`,
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
                      'data-test-subj': `hot-selectedMaxAgeUnits`,
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
        </DescribedFormField>
      </div>
    </EuiAccordion>
  );
};
