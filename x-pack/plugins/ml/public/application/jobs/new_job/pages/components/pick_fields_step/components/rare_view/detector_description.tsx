/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FC, useContext, useEffect, useState } from 'react';
import { EuiText, EuiCallOut } from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import { RareJobCreator } from '../../../../../common/job_creator';
import { RARE_DETECTOR_TYPE } from './rare_view';

interface Props {
  detectorType: RARE_DETECTOR_TYPE;
  isSummary?: boolean;
}

export const DetectorDescription: FC<Props> = ({ detectorType, isSummary = false }) => {
  const { jobCreator: jc, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as RareJobCreator;
  const [description, setDescription] = useState<string | null>(null);

  useEffect(() => {
    const desc = createDetectorDescription(jobCreator, detectorType, isSummary);
    setDescription(desc);
  }, [jobCreatorUpdated]);

  if (description === null) {
    return null;
  }

  return isSummary ? (
    <EuiText>
      <h5>{description}</h5>
    </EuiText>
  ) : (
    <EuiCallOut
      title={i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.calloutTitle',
        {
          defaultMessage: 'Detector summary',
        }
      )}
    >
      {description}
    </EuiCallOut>
  );
};

function createDetectorDescription(
  jobCreator: RareJobCreator,
  detectorType: RARE_DETECTOR_TYPE,
  isSummary: boolean
) {
  if (jobCreator.rareField === null) {
    return null;
  }

  const rareFieldName = jobCreator.rareField.id;
  const populationFieldName = jobCreator.populationField?.id;
  const splitFieldName = jobCreator.splitField?.id;

  const desc = [
    isSummary
      ? i18n.translate(
          'xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.beginningSummary',
          {
            defaultMessage: 'Detect ',
          }
        )
      : i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.beginning', {
          defaultMessage: 'This job will detect ',
        }),
  ];

  if (detectorType === RARE_DETECTOR_TYPE.FREQ_RARE_POPULATION) {
    desc.push(
      i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.frequently', {
        defaultMessage: 'frequently ',
      })
    );
  }

  desc.push(
    i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.values', {
      defaultMessage: 'rare values of ',
    })
  );
  desc.push(rareFieldName);

  if (populationFieldName !== undefined) {
    desc.push(
      i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.population', {
        defaultMessage: ' compared to the population of ',
      })
    );
    desc.push(populationFieldName);
  }

  if (splitFieldName !== undefined) {
    desc.push(
      i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.split', {
        defaultMessage: ', for each value of ',
      })
    );
    desc.push(splitFieldName);
  }
  desc.push('.');

  return desc.join('');
}
