/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';

import {
  EuiAccordion,
  EuiComboBox,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { KBN_FIELD_TYPES } from '@kbn/data-plugin/common';
import { isEsIngestPipelines } from '../../../../../../common/api_schemas/type_guards';
import { EditTransformFlyoutFormTextInput } from './edit_transform_flyout_form_text_input';
import { UseEditTransformFlyoutReturnType } from './use_edit_transform_flyout';
import { useAppDependencies } from '../../../../app_dependencies';
import { useApi } from '../../../../hooks/use_api';

interface EditTransformFlyoutFormProps {
  editTransformFlyout: UseEditTransformFlyoutReturnType;
  dataViewId?: string;
}

export const EditTransformFlyoutForm: FC<EditTransformFlyoutFormProps> = ({
  editTransformFlyout: [state, dispatch],
  dataViewId,
}) => {
  const { formFields, formSections } = state;
  const [dateFieldNames, setDateFieldNames] = useState<string[]>([]);
  const [ingestPipelineNames, setIngestPipelineNames] = useState<string[]>([]);

  const isRetentionPolicyAvailable = dateFieldNames.length > 0;

  const appDeps = useAppDependencies();
  const dataViewsClient = appDeps.data.dataViews;
  const api = useApi();

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

  useEffect(function fetchPipelinesOnMount() {
    let unmounted = false;

    async function getIngestPipelineNames() {
      const ingestPipelines = await api.getEsIngestPipelines();

      if (!unmounted && isEsIngestPipelines(ingestPipelines)) {
        setIngestPipelineNames(ingestPipelines.map(({ name }) => name));
      }
    }

    getIngestPipelineNames();

    return () => {
      unmounted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retentionDateFieldOptions = useMemo(() => {
    return Array.isArray(dateFieldNames)
      ? dateFieldNames.map((text: string) => ({ text, value: text }))
      : [];
  }, [dateFieldNames]);

  return (
    <EuiForm>
      <EditTransformFlyoutFormTextInput
        dataTestSubj="transformEditFlyoutDescriptionInput"
        errorMessages={formFields.description.errorMessages}
        label={i18n.translate('xpack.transform.transformList.editFlyoutFormDescriptionLabel', {
          defaultMessage: 'Description',
        })}
        onChange={(value) => dispatch({ field: 'description', value })}
        value={formFields.description.value}
      />

      <EditTransformFlyoutFormTextInput
        dataTestSubj="transformEditFlyoutFrequencyInput"
        errorMessages={formFields.frequency.errorMessages}
        helpText={i18n.translate('xpack.transform.transformList.editFlyoutFormFrequencyHelpText', {
          defaultMessage:
            'The interval between checks for changes in the source indices when the transform is running continuously. Also determines the retry interval in the event of transient failures while the transform is searching or indexing. The minimum value is 1s and the maximum is 1h.',
        })}
        label={i18n.translate('xpack.transform.transformList.editFlyoutFormFrequencyLabel', {
          defaultMessage: 'Frequency',
        })}
        onChange={(value) => dispatch({ field: 'frequency', value })}
        placeholder={i18n.translate(
          'xpack.transform.transformList.editFlyoutFormFrequencyPlaceholderText',
          {
            defaultMessage: 'Default: {defaultValue}',
            values: { defaultValue: formFields.frequency.defaultValue },
          }
        )}
        value={formFields.frequency.value}
      />

      <EuiSpacer size="l" />

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
          dispatch({
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
                isInvalid={formFields.retentionPolicyField.errorMessages.length > 0}
                error={formFields.retentionPolicyField.errorMessages}
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
                  value={formFields.retentionPolicyField.value}
                  onChange={(e) =>
                    dispatch({ field: 'retentionPolicyField', value: e.target.value })
                  }
                  hasNoInitialSelection={
                    !retentionDateFieldOptions
                      .map((d) => d.text)
                      .includes(formFields.retentionPolicyField.value)
                  }
                />
              </EuiFormRow>
            ) : (
              <EditTransformFlyoutFormTextInput
                dataTestSubj="transformEditFlyoutRetentionPolicyFieldInput"
                errorMessages={formFields.retentionPolicyField.errorMessages}
                label={i18n.translate(
                  'xpack.transform.transformList.editFlyoutFormRetentionPolicyFieldLabel',
                  {
                    defaultMessage: 'Field',
                  }
                )}
                onChange={(value) => dispatch({ field: 'retentionPolicyField', value })}
                value={formFields.retentionPolicyField.value}
              />
            )
          }
          <EditTransformFlyoutFormTextInput
            dataTestSubj="transformEditFlyoutRetentionPolicyMaxAgeInput"
            errorMessages={formFields.retentionPolicyMaxAge.errorMessages}
            label={i18n.translate(
              'xpack.transform.transformList.editFlyoutFormRetentionMaxAgeFieldLabel',
              {
                defaultMessage: 'Max age',
              }
            )}
            onChange={(value) => dispatch({ field: 'retentionPolicyMaxAge', value })}
            value={formFields.retentionPolicyMaxAge.value}
          />
        </div>
      )}

      <EuiSpacer size="l" />

      <EuiAccordion
        data-test-subj="transformEditAccordionDestination"
        id="transformEditAccordionDestination"
        buttonContent={i18n.translate(
          'xpack.transform.transformList.editFlyoutFormDestinationButtonContent',
          {
            defaultMessage: 'Destination configuration',
          }
        )}
        paddingSize="s"
      >
        <div data-test-subj="transformEditAccordionDestinationContent">
          <EditTransformFlyoutFormTextInput
            dataTestSubj="transformEditFlyoutDestinationIndexInput"
            errorMessages={formFields.destinationIndex.errorMessages}
            label={i18n.translate(
              'xpack.transform.transformList.editFlyoutFormDestinationIndexLabel',
              {
                defaultMessage: 'Destination index',
              }
            )}
            onChange={(value) => dispatch({ field: 'destinationIndex', value })}
            value={formFields.destinationIndex.value}
          />

          <EuiSpacer size="m" />

          <div data-test-subj="transformEditAccordionIngestPipelineContent">
            {
              // If the list of ingest pipelines is not available
              // gracefully defaults to text input
              ingestPipelineNames ? (
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.transform.transformList.editFlyoutFormDestinationIngestPipelineLabel',
                    {
                      defaultMessage: 'Ingest Pipeline',
                    }
                  )}
                  isInvalid={formFields.destinationIngestPipeline.errorMessages.length > 0}
                  error={formFields.destinationIngestPipeline.errorMessages}
                >
                  <EuiComboBox
                    data-test-subj="transformEditFlyoutDestinationIngestPipelineFieldSelect"
                    aria-label={i18n.translate(
                      'xpack.transform.stepDetailsForm.editFlyoutFormDestinationIngestPipelineFieldSelectAriaLabel',
                      {
                        defaultMessage: 'Select an ingest pipeline',
                      }
                    )}
                    placeholder={i18n.translate(
                      'xpack.transform.stepDetailsForm.editFlyoutFormDestinationIngestPipelineFieldSelectPlaceholder',
                      {
                        defaultMessage: 'Select an ingest pipeline',
                      }
                    )}
                    singleSelection={{ asPlainText: true }}
                    options={ingestPipelineNames.map((label: string) => ({ label }))}
                    selectedOptions={[{ label: formFields.destinationIngestPipeline.value }]}
                    onChange={(o) =>
                      dispatch({ field: 'destinationIngestPipeline', value: o[0]?.label ?? '' })
                    }
                  />
                </EuiFormRow>
              ) : (
                <EditTransformFlyoutFormTextInput
                  dataTestSubj="transformEditFlyoutDestinationIngestPipelineInput"
                  errorMessages={formFields.destinationIngestPipeline.errorMessages}
                  label={i18n.translate(
                    'xpack.transform.transformList.editFlyoutFormDestinationIngestPipelineLabel',
                    {
                      defaultMessage: 'Ingest Pipeline',
                    }
                  )}
                  onChange={(value) => dispatch({ field: 'destinationIngestPipeline', value })}
                  value={formFields.destinationIngestPipeline.value}
                />
              )
            }
          </div>
        </div>
      </EuiAccordion>

      <EuiSpacer size="l" />

      <EuiAccordion
        data-test-subj="transformEditAccordionAdvancedSettings"
        id="transformEditAccordionAdvancedSettings"
        buttonContent={i18n.translate(
          'xpack.transform.transformList.editFlyoutFormAdvancedSettingsButtonContent',
          {
            defaultMessage: 'Advanced settings',
          }
        )}
        paddingSize="s"
      >
        <div data-test-subj="transformEditAccordionAdvancedSettingsContent">
          <EditTransformFlyoutFormTextInput
            dataTestSubj="transformEditFlyoutDocsPerSecondInput"
            errorMessages={formFields.docsPerSecond.errorMessages}
            helpText={i18n.translate(
              'xpack.transform.transformList.editFlyoutFormDocsPerSecondHelptext',
              {
                defaultMessage:
                  'To enable throttling, set a limit of documents to input per second.',
              }
            )}
            label={i18n.translate(
              'xpack.transform.transformList.editFlyoutFormDocsPerSecondLabel',
              {
                defaultMessage: 'Documents per second',
              }
            )}
            onChange={(value) => dispatch({ field: 'docsPerSecond', value })}
            value={formFields.docsPerSecond.value}
          />

          <EditTransformFlyoutFormTextInput
            dataTestSubj="transformEditFlyoutMaxPageSearchSizeInput"
            errorMessages={formFields.maxPageSearchSize.errorMessages}
            helpText={i18n.translate(
              'xpack.transform.transformList.editFlyoutFormMaxPageSearchSizeHelptext',
              {
                defaultMessage:
                  'Defines the initial page size to use for the composite aggregation for each checkpoint.',
              }
            )}
            label={i18n.translate(
              'xpack.transform.transformList.editFlyoutFormMaxPageSearchSizeLabel',
              {
                defaultMessage: 'Maximum page search size',
              }
            )}
            onChange={(value) => dispatch({ field: 'maxPageSearchSize', value })}
            value={formFields.maxPageSearchSize.value}
            placeholder={i18n.translate(
              'xpack.transform.transformList.editFlyoutFormMaxPageSearchSizePlaceholderText',
              {
                defaultMessage: 'Default: {defaultValue}',
                values: { defaultValue: formFields.maxPageSearchSize.defaultValue },
              }
            )}
          />
        </div>
      </EuiAccordion>
    </EuiForm>
  );
};
