/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC, useContext, useEffect, useState } from 'react';
import { EuiCallOut } from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import { RareJobCreator } from '../../../../../common/job_creator';
import { RARE_DETECTOR_TYPE } from './rare_view';

interface Props {
  detectorType: RARE_DETECTOR_TYPE;
}

export const DetectorDescription: FC<Props> = ({ detectorType }) => {
  const { jobCreator: jc, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as RareJobCreator;
  const [description, setDescription] = useState<string[] | null>(null);

  useEffect(() => {
    const desc = createDetectorDescription(jobCreator, detectorType);
    setDescription(desc);
  }, [jobCreatorUpdated]);

  if (description === null) {
    return null;
  }

  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.calloutTitle',
        {
          defaultMessage: 'Detector summary',
        }
      )}
    >
      <FormattedMessage
        id="xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.title"
        defaultMessage="This job:"
      />
      <ul>
        {description.map((d) => (
          <li>{d}</li>
        ))}
      </ul>
    </EuiCallOut>
  );
};

function createDetectorDescription(jobCreator: RareJobCreator, detectorType: RARE_DETECTOR_TYPE) {
  if (jobCreator.rareField === null) {
    return null;
  }

  const rareFieldName = jobCreator.rareField.id;
  const populationFieldName = jobCreator.populationField?.id;
  const splitFieldName = jobCreator.splitField?.id;

  const beginningSummary = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.beginningSummary',
    {
      defaultMessage: 'detects rare values of {rareFieldName}',
      values: { rareFieldName },
    }
  );

  const beginningSummaryFreq = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.beginningSummaryFreq',
    {
      defaultMessage: 'detects frequently rare values of {rareFieldName}',
      values: { rareFieldName },
    }
  );

  const population = i18n.translate(
    'xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.population',
    {
      defaultMessage: 'compared to the population of {populationFieldName}',
      values: { populationFieldName },
    }
  );

  const split = i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.rareField.plainText.split', {
    defaultMessage: 'for each value of {splitFieldName}',
    values: { splitFieldName },
  });

  const desc = [];

  if (detectorType === RARE_DETECTOR_TYPE.FREQ_RARE_POPULATION) {
    desc.push(beginningSummaryFreq);
  } else {
    desc.push(beginningSummary);
  }

  if (populationFieldName !== undefined) {
    desc.push(population);
  }

  if (splitFieldName !== undefined) {
    desc.push(split);
  }

  return desc;
}
