/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useRef } from 'react';
import { EuiFieldText, EuiFormRow, EuiLink, EuiSpacer, EuiSwitch, EuiTextArea } from '@elastic/eui';
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
        isInvalid={createIndexPattern && destinationIndexPatternTitleExists}
        error={
          createIndexPattern &&
          destinationIndexPatternTitleExists && [
            i18n.translate('xpack.ml.dataframe.analytics.create.indexPatternExistsError', {
              defaultMessage: 'An index pattern with this title already exists.',
            }),
          ]
        }
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
