/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, type FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiFormRow, EuiSelect, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';
import { ToastNotificationText } from '../../../../components';
import { isLatestTransform, isPivotTransform } from '../../../../../../common/types/transform';
import { useGetTransformsPreview } from '../../../../hooks';

import { EditTransformFlyoutFormTextInput } from './edit_transform_flyout_form_text_input';
import { useEditTransformFlyout } from './use_edit_transform_flyout';
import { getErrorMessage } from '../../../../../../common/utils/errors';

export const EditTransformRetentionPolicy: FC = () => {
  const { i18n: i18nStart, theme } = useAppDependencies();

  const toastNotifications = useToastNotifications();

  const dataViewId = useEditTransformFlyout('dataViewId');
  const formSections = useEditTransformFlyout('stateFormSection');
  const retentionPolicyField = useEditTransformFlyout('retentionPolicyField');
  const { formField, formSection } = useEditTransformFlyout('actions');
  const requestConfig = useEditTransformFlyout('config');

  const previewRequest = useMemo(() => {
    return {
      source: requestConfig.source,
      ...(isPivotTransform(requestConfig) ? { pivot: requestConfig.pivot } : {}),
      ...(isLatestTransform(requestConfig) ? { latest: requestConfig.latest } : {}),
    };
  }, [requestConfig]);

  const { error: transformsPreviewError, data: transformPreview } =
    useGetTransformsPreview(previewRequest);

  const destIndexAvailableTimeFields = useMemo<string[]>(() => {
    if (transformPreview?.generated_dest_index) {
      const properties = transformPreview.generated_dest_index.mappings.properties;
      const timeFields: string[] = Object.keys(properties).filter(
        (col) => properties[col].type === 'date'
      );

      return timeFields;
    }
    return [];
  }, [transformPreview]);

  useEffect(() => {
    if (transformsPreviewError !== null) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.transform.transformList.errorGettingTransformPreview', {
          defaultMessage: 'An error occurred fetching the transform preview',
        }),
        text: toMountPoint(
          <ToastNotificationText text={getErrorMessage(transformsPreviewError)} />,
          { theme, i18n: i18nStart }
        ),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transformsPreviewError]);

  const isRetentionPolicyAvailable = destIndexAvailableTimeFields.length > 0;
  const retentionDateFieldOptions = useMemo(() => {
    return Array.isArray(destIndexAvailableTimeFields)
      ? destIndexAvailableTimeFields.map((text: string) => ({ text, value: text }))
      : [];
  }, [destIndexAvailableTimeFields]);

  return (
    <>
      <EuiFormRow
        helpText={
          isRetentionPolicyAvailable === false
            ? i18n.translate('xpack.transform.transformList.editFlyoutFormEetentionPolicyError', {
                defaultMessage:
                  'Retention policy settings are not available for indices without date fields.',
              })
            : ''
        }
      >
        <EuiSwitch
          name="transformEditRetentionPolicySwitch"
          label={i18n.translate(
            'xpack.transform.transformList.editFlyoutFormRetentionPolicySwitchLabel',
            {
              defaultMessage: 'Retention policy',
            }
          )}
          checked={formSections.retentionPolicy.enabled}
          onChange={(e) =>
            formSection({
              section: 'retentionPolicy',
              enabled: e.target.checked,
            })
          }
          disabled={!isRetentionPolicyAvailable}
          data-test-subj="transformEditRetentionPolicySwitch"
        />
      </EuiFormRow>
      {formSections.retentionPolicy.enabled && (
        <div data-test-subj="transformEditRetentionPolicyContent">
          <EuiSpacer size="m" />
          {
            // If data view or date fields info not available
            // gracefully defaults to text input
            dataViewId ? (
              <EuiFormRow
                label={i18n.translate(
                  'xpack.transform.transformList.editFlyoutFormRetentionPolicyFieldLabel',
                  {
                    defaultMessage: 'Field',
                  }
                )}
                isInvalid={retentionPolicyField.errorMessages.length > 0}
                error={retentionPolicyField.errorMessages}
                helpText={i18n.translate(
                  'xpack.transform.transformList.editFlyoutFormRetentionPolicyDateFieldHelpText',
                  {
                    defaultMessage:
                      'Select the date field that can be used to identify out of date documents in the destination index.',
                  }
                )}
              >
                <EuiSelect
                  aria-label={i18n.translate(
                    'xpack.transform.transformList.editFlyoutFormRetentionPolicyFieldSelectAriaLabel',
                    {
                      defaultMessage: 'Date field to set retention policy',
                    }
                  )}
                  data-test-subj="transformEditFlyoutRetentionPolicyFieldSelect"
                  options={retentionDateFieldOptions}
                  value={retentionPolicyField.value}
                  onChange={(e) =>
                    formField({ field: 'retentionPolicyField', value: e.target.value })
                  }
                  hasNoInitialSelection={
                    !retentionDateFieldOptions
                      .map((d) => d.text)
                      .includes(retentionPolicyField.value)
                  }
                />
              </EuiFormRow>
            ) : (
              <EditTransformFlyoutFormTextInput
                field="retentionPolicyField"
                label={i18n.translate(
                  'xpack.transform.transformList.editFlyoutFormRetentionPolicyFieldLabel',
                  {
                    defaultMessage: 'Field',
                  }
                )}
              />
            )
          }
          <EditTransformFlyoutFormTextInput
            field="retentionPolicyMaxAge"
            label={i18n.translate(
              'xpack.transform.transformList.editFlyoutFormRetentionPolicyMaxAgeLabel',
              {
                defaultMessage: 'Max age',
              }
            )}
          />
        </div>
      )}
    </>
  );
};
