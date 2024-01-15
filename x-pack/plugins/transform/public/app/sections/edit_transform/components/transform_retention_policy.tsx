/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { Draft } from 'immer';

import { EuiFormRow, EuiSelect, EuiSpacer, EuiSwitch } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormTextInput } from '@kbn/ml-form-utils/components/form_text_input';
import { useFormField } from '@kbn/ml-form-utils/use_form_field';
import { useFormSections } from '@kbn/ml-form-utils/use_form_sections';
import { createFormSlice, type State } from '@kbn/ml-form-utils/form_slice';

import { useDataView } from '../../create_transform/components/wizard/wizard';

export const TransformRetentionPolicy = <
  FF extends string,
  FS extends string,
  VN extends string,
  S extends State<FF, FS, VN>
>({
  slice,
  destIndexAvailableTimeFields,
}: {
  slice: ReturnType<typeof createFormSlice<FF, FS, VN, S>>;
  destIndexAvailableTimeFields: string[];
}) => {
  const dispatch = useDispatch();
  const dataView = useDataView();
  const dataViewId = dataView.id;
  const formSections = useFormSections(slice.name);
  const retentionPolicyField = useFormField(slice.name, 'retentionPolicyField');

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
