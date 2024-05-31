/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { debounce } from 'lodash';
import { EuiFieldText, EuiFormRow, EuiSpacer, EuiSwitch, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import { CreateDataViewForm } from '@kbn/ml-data-view-utils/components/create_data_view_form_row';
import { DestinationIndexForm } from '@kbn/ml-creation-wizard-utils/components/destination_index_form';

import { useMlKibana } from '../../../../../contexts/kibana';
import type { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { JOB_ID_MAX_LENGTH } from '../../../../../../../common/constants/validation';
import { ContinueButton } from '../continue_button';
import { ANALYTICS_STEPS } from '../../page';
import { ml } from '../../../../../services/ml_api_service';
import { useCanCreateDataView } from '../../hooks/use_can_create_data_view';
import { useDataViewTimeFields } from '../../hooks/use_data_view_time_fields';
import { AdditionalSection } from './additional_section';
import { IndexPermissionsCallout } from '../index_permissions_callout';

const DEFAULT_RESULTS_FIELD = 'ml';

const indexNameExistsMessage = i18n.translate(
  'xpack.ml.dataframe.analytics.create.destinationIndexHelpText',
  {
    defaultMessage:
      'An index with this name already exists. Be aware that running this analytics job will modify this destination index.',
  }
);

export const DetailsStepForm: FC<CreateAnalyticsStepProps> = ({
  actions,
  state,
  setCurrentStep,
}) => {
  const {
    services: { docLinks, notifications },
  } = useMlKibana();

  const canCreateDataView = useCanCreateDataView();
  const { dataViewAvailableTimeFields, onTimeFieldChanged } = useDataViewTimeFields({
    actions,
    state,
  });

  const createIndexLink = docLinks.links.apis.createIndex;
  const { setFormState } = actions;
  const { form, cloneJob, hasSwitchedToEditor, isJobCreated } = state;
  const {
    createDataView,
    description,
    destinationDataViewTitleExists,
    destinationIndex,
    destinationIndexNameEmpty,
    destinationIndexNameExists,
    destinationIndexNameValid,
    jobId,
    jobIdEmpty,
    jobIdExists,
    jobIdInvalidMaxLength,
    jobIdValid,
    resultsField,
    timeFieldName,
  } = form;

  const [destIndexSameAsId, setDestIndexSameAsId] = useState<boolean>(
    hasSwitchedToEditor === false && destinationIndex !== undefined && destinationIndex === jobId
  );
  const [useResultsFieldDefault, setUseResultsFieldDefault] = useState<boolean>(
    (cloneJob === undefined && hasSwitchedToEditor === false && resultsField === undefined) ||
      (cloneJob !== undefined && resultsField === DEFAULT_RESULTS_FIELD)
  );

  const forceInput = useRef<HTMLInputElement | null>(null);

  const isStepInvalid =
    jobIdEmpty === true ||
    jobIdExists === true ||
    jobIdValid === false ||
    destinationIndexNameEmpty === true ||
    destinationIndexNameValid === false ||
    (createDataView && destinationDataViewTitleExists === true);

  const debouncedIndexCheck = debounce(async () => {
    try {
      const resp = await ml.checkIndicesExists({ indices: [destinationIndex] });
      setFormState({ destinationIndexNameExists: resp[destinationIndex].exists });
    } catch (e) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.ml.dataframe.analytics.create.errorCheckingIndexExists', {
          defaultMessage: 'The following error occurred getting the existing index names: {error}',
          values: { error: extractErrorMessage(e) },
        })
      );
    }
  }, 400);

  const debouncedJobIdCheck = useMemo(
    () =>
      debounce(async () => {
        try {
          const results = await ml.dataFrameAnalytics.jobsExist([jobId], true);
          setFormState({ jobIdExists: results[jobId].exists });
        } catch (e) {
          notifications.toasts.addDanger(
            i18n.translate('xpack.ml.dataframe.analytics.create.errorCheckingJobIdExists', {
              defaultMessage: 'The following error occurred checking if job id exists: {error}',
              values: { error: extractErrorMessage(e) },
            })
          );
        }
      }, 400),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jobId]
  );

  useEffect(() => {
    if (jobIdValid === true) {
      debouncedJobIdCheck();
    } else if (typeof jobId === 'string' && jobId.trim() === '' && jobIdExists === true) {
      setFormState({ jobIdExists: false });
    }

    return () => {
      debouncedJobIdCheck.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    if (destinationIndexNameValid === true) {
      debouncedIndexCheck();
    } else if (
      typeof destinationIndex === 'string' &&
      destinationIndex.trim() === '' &&
      destinationIndexNameExists === true
    ) {
      setFormState({ destinationIndexNameExists: false });
    }

    return () => {
      debouncedIndexCheck.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationIndex]);

  useEffect(() => {
    if (destIndexSameAsId === true && !jobIdEmpty && jobIdValid) {
      setFormState({ destinationIndex: jobId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destIndexSameAsId, jobId]);

  return (
    <Fragment>
      <IndexPermissionsCallout indexName={destinationIndex} docsType="start" />
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
      <DestinationIndexForm
        createIndexLink={createIndexLink}
        destinationIndex={destinationIndex}
        destinationIndexNameEmpty={destinationIndexNameEmpty}
        destinationIndexNameExists={destinationIndexNameExists}
        destinationIndexNameValid={destinationIndexNameValid}
        destIndexSameAsId={destIndexSameAsId}
        indexNameExistsMessage={indexNameExistsMessage}
        isJobCreated={isJobCreated}
        onDestinationIndexChange={(d) => setFormState({ destinationIndex: d })}
        setDestIndexSameAsId={setDestIndexSameAsId}
        switchLabel={i18n.translate(
          'xpack.ml.dataframe.analytics.create.destinationIndexFormSwitchLabel',
          {
            defaultMessage: 'Use job ID as destination index name',
          }
        )}
      />
      <EuiFormRow fullWidth>
        <EuiSwitch
          disabled={isJobCreated}
          name="mlDataFrameAnalyticsUseResultsFieldDefault"
          label={i18n.translate('xpack.ml.dataframe.analytics.create.UseResultsFieldDefaultLabel', {
            defaultMessage: 'Use results field default value: "{defaultValue}"',
            values: { defaultValue: DEFAULT_RESULTS_FIELD },
          })}
          checked={useResultsFieldDefault === true}
          onChange={() => {
            if (!useResultsFieldDefault === true) {
              setFormState({ resultsField: undefined });
            }
            setUseResultsFieldDefault(!useResultsFieldDefault);
          }}
          data-test-subj="mlAnalyticsCreateJobWizardUseResultsFieldDefault"
        />
      </EuiFormRow>
      {useResultsFieldDefault === false && (
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.ml.dataframe.analytics.create.resultsFieldLabel', {
            defaultMessage: 'Results field',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.resultsFieldHelpText', {
            defaultMessage:
              'Define the name of the field in which to store the results of the analysis. Defaults to ml.',
          })}
        >
          <EuiFieldText
            disabled={isJobCreated}
            placeholder="Results field"
            value={resultsField}
            onChange={(e) => setFormState({ resultsField: e.target.value })}
            aria-label={i18n.translate(
              'xpack.ml.dataframe.analytics.create.resultsFieldInputAriaLabel',
              {
                defaultMessage:
                  'The name of the field in which to store the results of the analysis.',
              }
            )}
            data-test-subj="mlAnalyticsCreateJobWizardResultsFieldInput"
          />
        </EuiFormRow>
      )}
      <CreateDataViewForm
        canCreateDataView={canCreateDataView}
        createDataView={createDataView}
        dataViewTitleExists={destinationDataViewTitleExists}
        setCreateDataView={() => setFormState({ createDataView: !createDataView })}
        dataViewAvailableTimeFields={dataViewAvailableTimeFields}
        dataViewTimeField={timeFieldName}
        onTimeFieldChanged={onTimeFieldChanged}
      />
      <EuiSpacer size="s" />
      <AdditionalSection formState={state.form} setFormState={setFormState} />
      <EuiSpacer />
      <ContinueButton
        isDisabled={isStepInvalid}
        onClick={() => {
          setCurrentStep(ANALYTICS_STEPS.VALIDATION);
        }}
      />
    </Fragment>
  );
};
