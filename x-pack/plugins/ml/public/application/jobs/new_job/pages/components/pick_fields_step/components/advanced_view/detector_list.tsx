/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  EuiTitle,
  EuiPanel,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonIcon,
  EuiSpacer,
  EuiCallOut,
  EuiHorizontalRule,
  EuiFormRow,
} from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import { AdvancedJobCreator } from '../../../../../common/job_creator';
import { Validation } from '../../../../../common/job_validator';
import { detectorToString } from '../../../../../../../util/string_utils';
import { Detector } from '../../../../../../../../../common/types/anomaly_detection_jobs';

interface Props {
  isActive: boolean;
  onEditJob: (i: number) => void;
  onDeleteJob: (i: number) => void;
}

export const DetectorList: FC<Props> = ({ isActive, onEditJob, onDeleteJob }) => {
  const {
    jobCreator: jc,
    jobCreatorUpdated,
    jobValidator,
    jobValidatorUpdated,
  } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator;
  const [detectors, setDetectors] = useState(jobCreator.detectors);
  const [validation, setValidation] = useState(jobValidator.duplicateDetectors);

  useEffect(() => {
    setDetectors(jobCreator.detectors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  useEffect(() => {
    if (!jobValidator.duplicateDetectors.valid) {
      setValidation(jobValidator.duplicateDetectors);
    }
    if (!jobValidator.categorizerVaryingPerPartitionField.valid) {
      setValidation(jobValidator.categorizerVaryingPerPartitionField);
    }
    if (!jobValidator.categorizerMissingPerPartition.valid) {
      setValidation(jobValidator.categorizerMissingPerPartition);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobValidatorUpdated]);

  const Buttons: FC<{ index: number }> = ({ index }) => {
    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiButtonIcon
            color="primary"
            onClick={() => onEditJob(index)}
            iconType="pencil"
            aria-label={i18n.translate(
              'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorList.editButton',
              {
                defaultMessage: 'Edit',
              }
            )}
            data-test-subj="mlAdvancedDetectorEditButton"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonIcon
            color="danger"
            onClick={() => onDeleteJob(index)}
            iconType="trash"
            aria-label={i18n.translate(
              'xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorList.deleteButton',
              {
                defaultMessage: 'Delete',
              }
            )}
            data-test-subj="mlAdvancedDetectorDeleteButton"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.advancedDetectorList.title"
            defaultMessage="Detectors"
          />
        </h3>
      </EuiTitle>

      <NoDetectorsWarning show={detectors.length === 0} />

      <EuiFlexGrid columns={3}>
        {detectors.map((d, i) => (
          <EuiFlexItem key={i} data-test-subj={`mlAdvancedDetector ${i}`}>
            <EuiPanel paddingSize="m">
              <EuiFlexGroup>
                <EuiFlexItem>
                  {d.detector_description !== undefined ? (
                    <div style={{ fontWeight: 'bold' }} data-test-subj="mlDetectorDescription">
                      {d.detector_description}
                    </div>
                  ) : (
                    <StringifiedDetector detector={d} />
                  )}
                </EuiFlexItem>
                {isActive && (
                  <EuiFlexItem grow={false}>
                    <Buttons index={i} />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              {d.detector_description !== undefined && (
                <>
                  <EuiHorizontalRule margin="s" />
                  <StringifiedDetector detector={d} />
                </>
              )}
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>

      <EuiSpacer size="m" />

      <DetectorsValidationWarning validation={validation} />
      <EuiSpacer size="m" />
    </>
  );
};

const NoDetectorsWarning: FC<{ show: boolean }> = ({ show }) => {
  if (show === false) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        title={i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.noDetectorsCallout.title', {
          defaultMessage: 'No detectors',
        })}
        iconType="alert"
        data-test-subj="mlAdvancedNoDetectorsMessage"
      >
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.noDetectorsCallout.message"
          defaultMessage="At least one detector is needed to create a job."
        />
      </EuiCallOut>
    </>
  );
};

const DetectorsValidationWarning: FC<{ validation: Validation }> = ({ validation }) => {
  if (validation.valid === true) {
    return null;
  }
  return (
    <>
      <EuiSpacer size="s" />
      <EuiFormRow error={validation.message} isInvalid={validation.valid === false}>
        <></>
      </EuiFormRow>
    </>
  );
};

const StringifiedDetector: FC<{ detector: Detector }> = ({ detector }) => {
  return <div data-test-subj="mlDetectorIdentifier">{detectorToString(detector)}</div>;
};
