/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';

import { EuiForm, EuiAccordion, EuiSpacer, EuiSelect, EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EditTransformFlyoutFormTextInput } from './edit_transform_flyout_form_text_input';
import { UseEditTransformFlyoutReturnType } from './use_edit_transform_flyout';
import { useAppDependencies } from '../../../../app_dependencies';
import { KBN_FIELD_TYPES } from '../../../../../../../../../src/plugins/data/common';

interface EditTransformFlyoutFormProps {
  editTransformFlyout: UseEditTransformFlyoutReturnType;
  indexPatternId?: string;
}

export const EditTransformFlyoutForm: FC<EditTransformFlyoutFormProps> = ({
  editTransformFlyout: [state, dispatch],
  indexPatternId,
}) => {
  const formFields = state.formFields;
  const [dateFieldNames, setDateFieldNames] = useState<string[]>([]);

  const appDeps = useAppDependencies();
  const indexPatternsClient = appDeps.data.indexPatterns;

  useEffect(
    function getDateFields() {
      let unmounted = false;
      if (indexPatternId !== undefined) {
        indexPatternsClient.get(indexPatternId).then((indexPattern) => {
          if (indexPattern) {
            const dateTimeFields = indexPattern.fields
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
    [indexPatternId, indexPatternsClient]
  );

  const retentionDateFieldOptions = useMemo(() => {
    return Array.isArray(dateFieldNames) ? dateFieldNames.map((text: string) => ({ text })) : [];
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

          <EditTransformFlyoutFormTextInput
            dataTestSubj="transformEditFlyoutDestinationPipelineInput"
            errorMessages={formFields.destinationPipeline.errorMessages}
            label={i18n.translate(
              'xpack.transform.transformList.editFlyoutFormDestinationPipelineLabel',
              {
                defaultMessage: 'Pipeline',
              }
            )}
            onChange={(value) => dispatch({ field: 'destinationPipeline', value })}
            value={formFields.destinationPipeline.value}
          />
        </div>
      </EuiAccordion>

      <EuiSpacer size="l" />

      <EuiAccordion
        data-test-subj="transformEditAccordionRetentionPolicy"
        id="transformEditAccordionRetentionPolicy"
        buttonContent={i18n.translate(
          'xpack.transform.transformList.editFlyoutFormRetentionPolicyButtonContent',
          {
            defaultMessage: 'Retention policy',
          }
        )}
        paddingSize="s"
      >
        <div data-test-subj="transformEditAccordionRetentionPolicyContent">
          {
            // If index pattern or date fields info not available
            // gracefully defaults to text input
            indexPatternId ? (
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
