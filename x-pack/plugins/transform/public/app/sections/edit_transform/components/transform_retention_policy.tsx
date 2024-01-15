/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { Draft } from 'immer';

import { EuiFormRow, EuiSelect, EuiSpacer, EuiSwitch } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FormTextInput } from '@kbn/ml-form-utils/components/form_text_input';
import { useFormSections } from '@kbn/ml-form-utils/use_form_sections';
import { createFormSlice, type State } from '@kbn/ml-form-utils/form_slice';

import type { PostTransformsPreviewRequestSchema } from '../../../../../common/api_schemas/transforms';
import { isLatestTransform, isPivotTransform } from '../../../../../common/types/transform';
import { getErrorMessage } from '../../../../../common/utils/errors';

import { useAppDependencies, useToastNotifications } from '../../../app_dependencies';
import { useGetTransformsPreview } from '../../../hooks';
import { ToastNotificationText } from '../../../components';

import { useEditTransformFlyoutContext } from '../state_management/edit_transform_flyout_state';
import { useRetentionPolicyField } from '../state_management/selectors/retention_policy_field';

export const TransformRetentionPolicy = <
  FF extends string,
  FS extends string,
  VN extends string,
  S extends State<FF, FS, VN>
>({
  slice,
}: {
  slice: ReturnType<typeof createFormSlice<FF, FS, VN, S>>;
}) => {
  const dispatch = useDispatch();
  const { i18n: i18nStart, theme } = useAppDependencies();

  const toastNotifications = useToastNotifications();

  const { config, dataViewId } = useEditTransformFlyoutContext();
  const formSections = useFormSections(slice.name);
  const retentionPolicyField = useRetentionPolicyField();

  const previewRequest: PostTransformsPreviewRequestSchema = useMemo(() => {
    return {
      source: config.source,
      ...(isPivotTransform(config) ? { pivot: config.pivot } : {}),
      ...(isLatestTransform(config) ? { latest: config.latest } : {}),
    };
  }, [config]);

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
            ? i18n.translate('xpack.transform.RetentionPolicyError', {
                defaultMessage:
                  'Retention policy settings are not available for indices without date fields.',
              })
            : ''
        }
      >
        <EuiSwitch
          name="transformRetentionPolicy"
          label={i18n.translate('xpack.transform.retentionPolicySwitchLabel', {
            defaultMessage: 'Retention policy',
          })}
          checked={formSections.retentionPolicy.enabled}
          onChange={(e) =>
            dispatch(
              slice.actions.setFormSection({
                section: 'retentionPolicy' as keyof Draft<S>['formSections'],
                enabled: e.target.checked,
              })
            )
          }
          disabled={!isRetentionPolicyAvailable}
          data-test-subj="transformRetentionPolicySwitch"
        />
      </EuiFormRow>
      {formSections.retentionPolicy.enabled && (
        <div data-test-subj="transformRetentionPolicyContent">
          <EuiSpacer size="m" />
          {
            // If data view or date fields info not available
            // gracefully defaults to text input
            dataViewId ? (
              <EuiFormRow
                label={i18n.translate('xpack.transform.retentionPolicyFieldLabel', {
                  defaultMessage: 'Date field for retention policy',
                })}
                isInvalid={retentionPolicyField.errorMessages.length > 0}
                error={retentionPolicyField.errorMessages}
                helpText={i18n.translate('xpack.transform.retentionPolicyDateFieldHelpText', {
                  defaultMessage:
                    'Select the date field that can be used to identify out of date documents in the destination index.',
                })}
              >
                <EuiSelect
                  aria-label={i18n.translate(
                    'xpack.transform.transformList.editFlyoutFormRetentionPolicyFieldSelectAriaLabel',
                    {
                      defaultMessage: 'Date field to set retention policy',
                    }
                  )}
                  data-test-subj="retentionPolicyFieldSelect"
                  options={retentionDateFieldOptions}
                  value={retentionPolicyField.value}
                  onChange={(e) =>
                    dispatch(
                      slice.actions.setFormField({
                        field: 'retentionPolicyField' as keyof Draft<S>['formFields'],
                        value: e.target.value,
                      })
                    )
                  }
                  hasNoInitialSelection={
                    !retentionDateFieldOptions
                      .map((d) => d.text)
                      .includes(retentionPolicyField.value)
                  }
                />
              </EuiFormRow>
            ) : (
              <FormTextInput
                slice={slice}
                field={'retentionPolicyField' as keyof S['formFields']}
                label={i18n.translate('xpack.transform.retentionPolicyFieldLabel', {
                  defaultMessage: 'Date field to set retention policy',
                })}
              />
            )
          }
          <FormTextInput
            slice={slice}
            field={'retentionPolicyMaxAge' as keyof S['formFields']}
            label={i18n.translate(
              'xpack.transform.transformList.editFlyoutFormRetentionPolicyMaxAgeLabel',
              {
                defaultMessage: 'Max age',
              }
            )}
            helpText={i18n.translate('xpack.transform.retentionPolicyMaxAgeHelpText', {
              defaultMessage:
                'Documents that are older than the configured value will be removed from the destination index.',
            })}
          />
        </div>
      )}
    </>
  );
};
