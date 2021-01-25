/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState } from 'react';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCallOut,
  EuiTextColor,
  EuiSwitch,
  EuiIconTip,
} from '@elastic/eui';

import { useFormData, UseField, SelectField, NumericField } from '../../../../../../shared_imports';

import { i18nTexts } from '../../../i18n_texts';

import { ROLLOVER_EMPTY_VALIDATION, useConfigurationIssues } from '../../../form';

import { useEditPolicyContext } from '../../../edit_policy_context';

import { ROLLOVER_FORM_PATHS, isUsingDefaultRolloverPath } from '../../../constants';

import { LearnMoreLink, DescribedFormRow } from '../../';

import {
  ForcemergeField,
  IndexPriorityField,
  SearchableSnapshotField,
  ReadonlyField,
  ShrinkField,
} from '../shared_fields';

import { Phase } from '../phase';
import { maxSizeStoredUnits, maxAgeUnits } from './constants';

export const HotPhase: FunctionComponent = () => {
  const { license } = useEditPolicyContext();
  const [formData] = useFormData({
    watch: isUsingDefaultRolloverPath,
  });
  const { isUsingRollover } = useConfigurationIssues();
  const isUsingDefaultRollover: boolean = get(formData, isUsingDefaultRolloverPath);
  const [showEmptyRolloverFieldsError, setShowEmptyRolloverFieldsError] = useState(false);

  return (
    <Phase phase={'hot'}>
      <DescribedFormRow
        title={
          <h3>
            {i18n.translate('xpack.indexLifecycleMgmt.hotPhase.rolloverFieldTitle', {
              defaultMessage: 'Rollover',
            })}
          </h3>
        }
        description={
          <>
            <EuiTextColor color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.hotPhase.rolloverDescriptionMessage"
                  defaultMessage="Automate rollover of time series data for efficient storage and higher performance."
                />{' '}
                <LearnMoreLink
                  text={
                    <FormattedMessage
                      id="xpack.indexLifecycleMgmt.editPolicy.hotPhase.learnAboutRolloverLinkText"
                      defaultMessage="Learn more"
                    />
                  }
                  docPath="ilm-rollover.html"
                />
              </p>
            </EuiTextColor>
            <EuiSpacer />
            <UseField<boolean> path={isUsingDefaultRolloverPath}>
              {(field) => (
                <>
                  <EuiSwitch
                    label={field.label}
                    checked={field.value}
                    onChange={(e) => field.setValue(e.target.checked)}
                    data-test-subj="useDefaultRolloverSwitch"
                  />
                  &nbsp;
                  <EuiIconTip
                    type="questionInCircle"
                    content={
                      <FormattedMessage
                        id="xpack.indexLifecycleMgmt.editPolicy.hotPhase.rolloverDefaultsTipContent"
                        defaultMessage="Rollover when an index is 30 days old or reaches 50 gigabytes."
                      />
                    }
                  />
                </>
              )}
            </UseField>
          </>
        }
        fullWidth
      >
        {isUsingDefaultRollover === false ? (
          <div aria-live="polite" role="region">
            <UseField<boolean> path="_meta.hot.customRollover.enabled">
              {(field) => (
                <>
                  <EuiSwitch
                    label={field.label}
                    checked={field.value}
                    onChange={(e) => field.setValue(e.target.checked)}
                    data-test-subj="rolloverSwitch"
                  />
                  &nbsp;
                  <EuiIconTip
                    type="questionInCircle"
                    content={
                      <FormattedMessage
                        id="xpack.indexLifecycleMgmt.editPolicy.hotPhase.enableRolloverTipContent"
                        defaultMessage="Roll over to a new index when the
    current index meets one of the defined conditions."
                      />
                    }
                  />
                </>
              )}
            </UseField>
            {isUsingRollover && (
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
                          (e) => e.code === ROLLOVER_EMPTY_VALIDATION
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
                      key="_meta.hot.customRollover.maxStorageSizeUnit"
                      path="_meta.hot.customRollover.maxStorageSizeUnit"
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
                      key="_meta.hot.customRollover.maxAgeUnit"
                      path="_meta.hot.customRollover.maxAgeUnit"
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
          </div>
        ) : (
          <div />
        )}
      </DescribedFormRow>
      {isUsingRollover && (
        <>
          {<ForcemergeField phase={'hot'} />}
          <ShrinkField phase={'hot'} />
          {license.canUseSearchableSnapshot() && <SearchableSnapshotField phase={'hot'} />}
          <ReadonlyField phase={'hot'} />
        </>
      )}
      <IndexPriorityField phase={'hot'} />
    </Phase>
  );
};
