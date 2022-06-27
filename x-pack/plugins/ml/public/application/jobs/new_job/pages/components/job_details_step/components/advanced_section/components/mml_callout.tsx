/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { JobCreatorContext } from '../../../../job_creator_context';

export const MMLCallout: FC = () => {
  const { jobCreator, jobValidator, jobValidatorUpdated } = useContext(JobCreatorContext);
  const [highCardinality, setHighCardinality] = useState<number | null>(null);

  useEffect(() => {
    const value = jobValidator.latestValidationResult?.highCardinality?.value ?? null;
    setHighCardinality(value);
  }, [jobValidatorUpdated]);

  return jobCreator.modelPlot && highCardinality !== null ? (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.jobDetailsStep.advancedSection.mmlWarning.title"
          defaultMessage="Proceed with caution!"
        />
      }
      color="warning"
      iconType="help"
    >
      <EuiText>
        <FormattedMessage
          id="xpack.ml.newJob.wizard.jobDetailsStep.advancedSection.mmlWarning.message"
          defaultMessage="Creating model plots is resource intensive and not recommended
                where the cardinality of the selected fields is greater than 100. Estimated cardinality
                for this job is {highCardinality}.
                If you enable model plot with this configuration we recommend you use a dedicated results index."
          values={{ highCardinality }}
        />
      </EuiText>
    </EuiCallOut>
  ) : null;
};
