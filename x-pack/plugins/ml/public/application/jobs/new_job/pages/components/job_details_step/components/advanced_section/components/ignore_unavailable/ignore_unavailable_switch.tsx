/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useContext, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSwitch } from '@elastic/eui';
import { JobCreatorContext } from '../../../../../job_creator_context';
import { Description } from './description';

export const IgnoreUnavailableSwitch: FC = () => {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);
  const [ignoreUnavailable, setIgnoreUnavailable] = useState(jobCreator.ignoreUnavailable);

  useEffect(() => {
    jobCreator.ignoreUnavailable = ignoreUnavailable;
    jobCreatorUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ignoreUnavailable]);

  function toggleIgnoreUnavailable() {
    setIgnoreUnavailable(!ignoreUnavailable);
  }

  return (
    <Description>
      <EuiSwitch
        name="ignoreUnavailableSwitch"
        checked={ignoreUnavailable}
        onChange={toggleIgnoreUnavailable}
        data-test-subj="mlJobWizardSwitchIgnoreUnavailableIndex"
        label={i18n.translate(
          'xpack.ml.newJob.wizard.jobDetailsStep.advancedSection.ignoreUnavailable.title',
          {
            defaultMessage: 'Ignore unavailable indices',
          }
        )}
      />
    </Description>
  );
};
