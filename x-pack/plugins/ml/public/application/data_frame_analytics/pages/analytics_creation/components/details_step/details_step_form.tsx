/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useRef } from 'react';
import {
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useMlKibana } from '../../../../../contexts/kibana';
import { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { JOB_ID_MAX_LENGTH } from '../../../../../../../common/constants/validation';
import { ContinueButton } from '../continue_button';
import { ANALYTICS_STEPS } from '../../page';

export const DetailsStepForm: FC<CreateAnalyticsStepProps> = ({
  actions,
  state,
  setCurrentStep,
}) => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;

  const { setFormState } = actions;
  const { form, isJobCreated } = state;
  const {
    createIndexPattern,
    description,
    destinationIndex,
    destinationIndexNameEmpty,
    destinationIndexNameExists,
    destinationIndexNameValid,
    destinationIndexPatternTitleExists,
    jobId,
    jobIdEmpty,
    jobIdExists,
    jobIdInvalidMaxLength,
    jobIdValid,
    resultsField,
  } = form;
  const forceInput = useRef<HTMLInputElement | null>(null);

  const isStepInvalid =
    jobIdEmpty === true ||
    jobIdExists === true ||
    jobIdValid === false ||
    destinationIndexNameEmpty === true ||
    destinationIndexNameValid === false ||
    (destinationIndexPatternTitleExists === true && createIndexPattern === true);

  return (
    <Fragment>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.ml.dataframe.analytics.create.jobIdLabel', {
          defaultMessage: 'Job ID',
        })}
        isInvalid={(!jobIdEmpty && !jobIdValid) || jobIdExists || jobIdInvalidMaxLength}
        error={[
          ...(!jobIdEmpty && !jobIdValid
            ? [
                i18n.translate('xpack.ml.dataframe.analytics.create.jobIdInvalidError', {
                  defaultMessage:
                    'Must contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores only and must start and end with alphanumeric characters.',
                }),
              ]
            : []),
          ...(jobIdExists
            ? [
                i18n.translate('xpack.ml.dataframe.analytics.create.jobIdExistsError', {
                  defaultMessage: 'An analytics job with this ID already exists.',
                }),
              ]
            : []),
          ...(jobIdInvalidMaxLength
            ? [
                i18n.translate(
                  'xpack.ml.dataframe.analytics.create.jobIdInvalidMaxLengthErrorMessage',
                  {
                    defaultMessage:
                      'Job ID must be no more than {maxLength, plural, one {# character} other {# characters}} long.',
                    values: {
                      maxLength: JOB_ID_MAX_LENGTH,
                    },
                  }
                ),
              ]
            : []),
        ]}
      >
        <EuiFieldText
          fullWidth
          inputRef={(input) => {
            if (input) {
              forceInput.current = input;
            }
          }}
          disabled={isJobCreated}
          placeholder={i18n.translate('xpack.ml.dataframe.analytics.create.jobIdPlaceholder', {
            defaultMessage: 'Job ID',
          })}
          value={jobId}
          onChange={(e) => setFormState({ jobId: e.target.value })}
          aria-label={i18n.translate('xpack.ml.dataframe.analytics.create.jobIdInputAriaLabel', {
            defaultMessage: 'Choose a unique analytics job ID.',
          })}
          isInvalid={(!jobIdEmpty && !jobIdValid) || jobIdExists || jobIdEmpty}
          data-test-subj="mlAnalyticsCreateJobFlyoutJobIdInput"
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.ml.dataframe.analytics.create.jobDescription.label', {
          defaultMessage: 'Job description',
        })}
      >
        <EuiTextArea
          fullWidth
          value={description}
          placeholder={i18n.translate(
            'xpack.ml.dataframe.analytics.create.jobDescription.helpText',
            {
              defaultMessage: 'Optional descriptive text',
            }
          )}
          rows={2}
          onChange={(e) => {
            const value = e.target.value;
            setFormState({ description: value });
          }}
          data-test-subj="mlDFAnalyticsJobCreationJobDescription"
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.ml.dataframe.analytics.create.destinationIndexLabel', {
          defaultMessage: 'Destination index',
        })}
        isInvalid={
          destinationIndexNameEmpty || (!destinationIndexNameEmpty && !destinationIndexNameValid)
        }
        helpText={
          destinationIndexNameExists &&
          i18n.translate('xpack.ml.dataframe.analytics.create.destinationIndexHelpText', {
            defaultMessage:
              'An index with this name already exists. Be aware that running this analytics job will modify this destination index.',
          })
        }
        error={
          !destinationIndexNameEmpty &&
          !destinationIndexNameValid && [
            <Fragment>
              {i18n.translate('xpack.ml.dataframe.analytics.create.destinationIndexInvalidError', {
                defaultMessage: 'Invalid destination index name.',
              })}
              <br />
              <EuiLink
                href={`${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/indices-create-index.html#indices-create-index`}
                target="_blank"
              >
                {i18n.translate(
                  'xpack.ml.dataframe.stepDetailsForm.destinationIndexInvalidErrorLink',
                  {
                    defaultMessage: 'Learn more about index name limitations.',
                  }
                )}
              </EuiLink>
            </Fragment>,
          ]
        }
      >
        <EuiFieldText
          fullWidth
          disabled={isJobCreated}
          placeholder="destination index"
          value={destinationIndex}
          onChange={(e) => setFormState({ destinationIndex: e.target.value })}
          aria-label={i18n.translate(
            'xpack.ml.dataframe.analytics.create.destinationIndexInputAriaLabel',
            {
              defaultMessage: 'Choose a unique destination index name.',
            }
          )}
          isInvalid={!destinationIndexNameEmpty && !destinationIndexNameValid}
          data-test-subj="mlAnalyticsCreateJobFlyoutDestinationIndexInput"
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.analytics.create.resultsFieldLabel', {
          defaultMessage: 'Results field',
        })}
        helpText={i18n.translate('xpack.ml.dataframe.analytics.create.resultsFieldHelpText', {
          defaultMessage:
            'Defines the name of the field in which to store the results of the analysis. Defaults to ml.',
        })}
      >
        <EuiFieldText
          disabled={isJobCreated}
          value={resultsField}
          onChange={(e) => setFormState({ resultsField: e.target.value })}
          data-test-subj="mlAnalyticsCreateJobWizardResultsFieldInput"
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        isInvalid={
          (createIndexPattern && destinationIndexPatternTitleExists) || !createIndexPattern
        }
        error={[
          ...(createIndexPattern && destinationIndexPatternTitleExists
            ? [
                i18n.translate('xpack.ml.dataframe.analytics.create.indexPatternExistsError', {
                  defaultMessage: 'An index pattern with this title already exists.',
                }),
              ]
            : []),
          ...(!createIndexPattern
            ? [
                <EuiText size="xs" color="warning">
                  {i18n.translate(
                    'xpack.ml.dataframe.analytics.create.shouldCreateIndexPatternMessage',
                    {
                      defaultMessage:
                        'You may not be able to view job results if an index pattern is not created for the destination index.',
                    }
                  )}
                </EuiText>,
              ]
            : []),
        ]}
      >
        <EuiSwitch
          disabled={isJobCreated}
          name="mlDataFrameAnalyticsCreateIndexPattern"
          label={i18n.translate('xpack.ml.dataframe.analytics.create.createIndexPatternLabel', {
            defaultMessage: 'Create index pattern',
          })}
          checked={createIndexPattern === true}
          onChange={() => setFormState({ createIndexPattern: !createIndexPattern })}
          data-test-subj="mlAnalyticsCreateJobWizardCreateIndexPatternSwitch"
        />
      </EuiFormRow>
      <EuiSpacer />
      <ContinueButton
        isDisabled={isStepInvalid}
        onClick={() => {
          setCurrentStep(ANALYTICS_STEPS.CREATE);
        }}
      />
    </Fragment>
  );
};
