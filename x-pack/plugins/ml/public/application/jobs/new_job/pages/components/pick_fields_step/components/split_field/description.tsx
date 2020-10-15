/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';

import { JOB_TYPE } from '../../../../../../../../../common/constants/new_job';

interface Props {
  jobType: JOB_TYPE;
}

export const Description: FC<Props> = memo(({ children, jobType }) => {
  if (jobType === JOB_TYPE.MULTI_METRIC) {
    const title = i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.splitField.title', {
      defaultMessage: 'Split field',
    });
    return (
      <EuiDescribedFormGroup
        title={<h3>{title}</h3>}
        description={
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.splitField.description"
            defaultMessage="Select a field to partition analysis by. Each value of this field will be modeled independently individually."
          />
        }
      >
        <EuiFormRow label={title}>
          <>{children}</>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  } else if (jobType === JOB_TYPE.POPULATION) {
    const title = i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.populationField.title', {
      defaultMessage: 'Population field',
    });
    return (
      <EuiDescribedFormGroup
        title={<h3>{title}</h3>}
        description={
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.populationField.description"
            defaultMessage="All values in the selected field will be modeled together as a population. This analysis type is recommended for high cardinality data."
          />
        }
      >
        <EuiFormRow label={title}>
          <>{children}</>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  } else {
    return null;
  }
});
