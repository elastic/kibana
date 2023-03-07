/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState, type FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiFormRow, EuiSelect, EuiSpacer, EuiSwitch } from '@elastic/eui';

import { KBN_FIELD_TYPES } from '@kbn/field-types';

import { useAppDependencies } from '../../../../app_dependencies';

import { EditTransformFlyoutFormTextInput } from './edit_transform_flyout_form_text_input';
import { useEditTransformFlyout } from './use_edit_transform_flyout';

export const EditTransformRetentionPolicy: FC = () => {
  const appDeps = useAppDependencies();
  const dataViewsClient = appDeps.data.dataViews;

  const dataViewId = useEditTransformFlyout('dataViewId');
  const formSections = useEditTransformFlyout('stateFormSection');
  const retentionPolicyField = useEditTransformFlyout('retentionPolicyField');
  const { formField, formSection } = useEditTransformFlyout('actions');

  const [dateFieldNames, setDateFieldNames] = useState<string[]>([]);

  useEffect(
    function getDateFields() {
      let unmounted = false;
      if (dataViewId !== undefined) {
        dataViewsClient.get(dataViewId).then((dataView) => {
          if (dataView) {
            const dateTimeFields = dataView.fields
              .filter((f) => f.type === KBN_FIELD_TYPES.DATE)
              .map((f) => f.name)
              .sort();
            if (!unmounted) {
              setDateFieldNames(dateTimeFields);
            }
          }
        });
        return () => {
          unmounted = true;
        };
      }
    },
    [dataViewId, dataViewsClient]
  );

  const isRetentionPolicyAvailable = dateFieldNames.length > 0;
  const retentionDateFieldOptions = useMemo(() => {
    return Array.isArray(dateFieldNames)
      ? dateFieldNames.map((text: string) => ({ text, value: text }))
      : [];
  }, [dateFieldNames]);

  return (
    <>
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
