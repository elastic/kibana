/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect, useCallback, useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiModal,
  EuiButton,
  EuiCallOut,
  EuiSpacer,
  EuiModalHeader,
  EuiLoadingSpinner,
  EuiModalHeaderTitle,
  EuiModalBody,
} from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import { AdvancedJobCreator } from '../../../../../common/job_creator';
import { resetAdvancedJob } from '../../../../../common/job_creator/util/general';
import {
  CombinedJob,
  Datafeed,
} from '../../../../../../../../../common/types/anomaly_detection_jobs';
import { extractErrorMessage } from '../../../../../../../../../common/util/errors';
import type { DatafeedValidationResponse } from '../../../../../../../../../common/types/job_validation';

import { SavedObjectFinderUi } from '../../../../../../../../../../../../src/plugins/saved_objects/public';
import {
  useMlKibana,
  useMlApiContext,
  useNavigateToPath,
} from '../../../../../../../contexts/kibana';

const fixedPageSize: number = 8;

interface Props {
  onClose: () => void;
}

export const ChangeDataViewModal: FC<Props> = ({ onClose }) => {
  const {
    services: {
      savedObjects,
      uiSettings,
      data: { dataViews },
    },
  } = useMlKibana();
  const navigateToPath = useNavigateToPath();
  const { validateDatafeedPreview } = useMlApiContext();

  const { jobCreator: jc } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator;

  const [validating, setValidating] = useState(false);
  const [step, setStep] = useState(0);

  const [currentDataViewTitle, setCurrentDataViewTitle] = useState<string>('');
  const [newDataViewTitle, setNewDataViewTitle] = useState<string>('');
  const [validationResponse, setValidationResponse] = useState<DatafeedValidationResponse | null>(
    null
  );

  useEffect(() => {
    setCurrentDataViewTitle(jobCreator.indexPatternTitle);
  }, []);

  function onDataViewSelected(dataViewId: string) {
    if (validating === false) {
      setStep(2);
      validate(dataViewId);
    }
  }

  useEffect(() => {
    if (step === 1) {
      setValidationResponse(null);
    }
  }, [step]);

  const validate = useCallback(
    async (dataViewId: string) => {
      setValidating(true);

      const { title } = await dataViews.get(dataViewId);
      setNewDataViewTitle(title);

      const indices = title.split(',');
      if (jobCreator.detectors.length) {
        const datafeed: Datafeed = { ...jobCreator.datafeedConfig, indices };
        const gg = await validateDatafeedPreview({
          job: {
            ...jobCreator.jobConfig,
            datafeed_config: datafeed,
          } as CombinedJob,
        });
        setValidationResponse(gg);
      }
      setValidating(false);
    },
    [dataViews, validateDatafeedPreview, jobCreator]
  );

  const applyDataView = useCallback(() => {
    if (newDataViewTitle === '') {
      console.error('data view title is empty'); // eslint-disable-line no-console
      return;
    }

    const newIndices = newDataViewTitle.split(',');
    jobCreator.indices = newIndices;
    resetAdvancedJob(jobCreator, navigateToPath);
  }, [jobCreator, newDataViewTitle, navigateToPath]);

  return (
    <>
      <EuiModal onClose={onClose} data-test-subj="mlJobMgmtImportJobsFlyout">
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.datafeedStep.dataView.step0.title"
              defaultMessage="Change data view"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          {step === 0 && (
            <>
              <FormattedMessage
                id="xpack.ml.newJob.wizard.datafeedStep.dataView.step0.description"
                defaultMessage="Really? You really want to change the Data View?"
              />
              <EuiSpacer size="s" />
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={onClose} isDisabled={validating} flush="left">
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.datafeedStep.dataView.step0.cancelButton"
                      defaultMessage="Cancel"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    isDisabled={validating}
                    onClick={setStep.bind(null, 1)}
                    fill
                    data-test-subj="mlJobMgmtImportImportButton"
                  >
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.datafeedStep.dataView.step0.nextButton"
                      defaultMessage="Next"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
          {step === 1 && (
            <>
              <FormattedMessage
                id="xpack.ml.newJob.wizard.datafeedStep.dataView.step1.title"
                defaultMessage="Select new Data View for job"
              />

              <EuiSpacer size="s" />

              <SavedObjectFinderUi
                key="searchSavedObjectFinder"
                onChoose={onDataViewSelected}
                showFilter
                noItemsMessage={i18n.translate(
                  'xpack.ml.newJob.wizard.datafeedStep.dataView.step1.noMatchingError',
                  {
                    defaultMessage: 'No matching indices or saved searches found.',
                  }
                )}
                savedObjectMetaData={[
                  {
                    type: 'index-pattern',
                    getIconForSavedObject: () => 'indexPatternApp',
                    name: i18n.translate(
                      'xpack.ml.newJob.wizard.datafeedStep.dataView.step1.dataView',
                      {
                        defaultMessage: 'Data view',
                      }
                    ),
                  },
                ]}
                fixedPageSize={fixedPageSize}
                uiSettings={uiSettings}
                savedObjects={savedObjects}
              />
            </>
          )}
          {step === 2 && (
            <>
              <FormattedMessage
                id="xpack.ml.newJob.wizard.datafeedStep.dataView.step2.title"
                defaultMessage="Changing {dv1} for {dv2}"
                values={{ dv1: currentDataViewTitle, dv2: newDataViewTitle }}
              />

              <EuiSpacer size="s" />

              {validating === true ? (
                <>
                  <EuiLoadingSpinner />
                  <FormattedMessage
                    id="xpack.ml.newJob.wizard.datafeedStep.dataView.step2.validatingText"
                    defaultMessage=" Checking compatibility of Data View with job"
                  />
                </>
              ) : (
                <ValidationMessage
                  validationResponse={validationResponse}
                  dataViewTitle={newDataViewTitle}
                />
              )}

              <EuiSpacer size="s" />

              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={setStep.bind(null, 1)}
                    isDisabled={validating}
                    flush="left"
                  >
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.datafeedStep.dataView.step2.backButton"
                      defaultMessage="Back"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={() => applyDataView()}
                    isDisabled={validating}
                    data-test-subj="mlJobsImportButton"
                  >
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.datafeedStep.dataView.step2.ApplyButton"
                      defaultMessage="Apply"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
        </EuiModalBody>
      </EuiModal>
    </>
  );
};

const ValidationMessage: FC<{
  validationResponse: DatafeedValidationResponse | null;
  dataViewTitle: string;
}> = ({ validationResponse, dataViewTitle }) => {
  if (validationResponse === null) {
    return (
      <EuiCallOut
        title={i18n.translate(
          'xpack.ml.newJob.wizard.datafeedStep.dataView.validation.noDetectors.title',
          {
            defaultMessage: 'Data View valid',
          }
        )}
        color="primary"
      >
        <FormattedMessage
          id="xpack.ml.newJob.wizard.datafeedStep.dataView.validation.noDetectors.message"
          defaultMessage="No detectors have been configured, so changing to this Data View should be ok."
        />
      </EuiCallOut>
    );
  }
  if (validationResponse.valid === true) {
    if (validationResponse.documentsFound === true) {
      return (
        <EuiCallOut
          title={i18n.translate(
            'xpack.ml.newJob.wizard.datafeedStep.dataView.validation.valid.title',
            {
              defaultMessage: 'Data View valid',
            }
          )}
          color="primary"
        >
          <FormattedMessage
            id="xpack.ml.newJob.wizard.datafeedStep.dataView.validation.valid.message"
            defaultMessage="This Data View appears to be a good match for this job."
          />
        </EuiCallOut>
      );
    } else {
      return (
        <EuiCallOut
          title={i18n.translate(
            'xpack.ml.newJob.wizard.datafeedStep.dataView.validation.possiblyInvalid.title',
            {
              defaultMessage: 'Data View possibly invalid',
            }
          )}
          color="warning"
        >
          <FormattedMessage
            id="xpack.ml.newJob.wizard.datafeedStep.dataView.validation.possiblyInvalid.message"
            defaultMessage="This Data View produced no results when previewing the datafeed. This could be due to there being no documents in {dataViewTitle}."
            values={{ dataViewTitle }}
          />
        </EuiCallOut>
      );
    }
  } else {
    return (
      <EuiCallOut
        title={i18n.translate(
          'xpack.ml.newJob.wizard.datafeedStep.dataView.validation.invalid.title',
          {
            defaultMessage: 'Data View invalid',
          }
        )}
        color="danger"
      >
        <FormattedMessage
          id="xpack.ml.newJob.wizard.datafeedStep.dataView.validation.invalid.message"
          defaultMessage="This Data View produced an error when attempting preview the datafeed. This could be due to fields selected for this job not existing in {dataViewTitle}."
          values={{ dataViewTitle }}
        />

        <EuiSpacer size="s" />

        <FormattedMessage
          id="xpack.ml.newJob.wizard.datafeedStep.dataView.validation.invalid.reason"
          defaultMessage="Reason:"
        />

        <EuiSpacer size="s" />

        {validationResponse.error ? extractErrorMessage(validationResponse.error) : null}
      </EuiCallOut>
    );
  }
};
