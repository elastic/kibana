/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';

import { useFormData } from '../../../../../shared_imports';

import { formDataToAbsoluteTimings } from '../../lib';

import { useConfigurationIssues } from '../../form';

import { FormInternal } from '../../types';

import { Timeline as ViewComponent } from './timeline';

export const Timeline: FunctionComponent = () => {
  const [formData] = useFormData<FormInternal>();
  const timings = formDataToAbsoluteTimings(formData);
  const { isUsingRollover } = useConfigurationIssues();
  return (
    <ViewComponent
      hotPhaseMinAge={timings.hot.min_age}
      warmPhaseMinAge={timings.warm?.min_age}
      coldPhaseMinAge={timings.cold?.min_age}
      deletePhaseMinAge={timings.delete?.min_age}
      isUsingRollover={isUsingRollover}
      hasDeletePhase={Boolean(formData._meta?.delete?.enabled)}
    />
  );
};
