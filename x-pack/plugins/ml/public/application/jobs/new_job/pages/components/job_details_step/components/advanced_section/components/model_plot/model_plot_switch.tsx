/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiSwitch } from '@elastic/eui';
import { JobCreatorContext } from '../../../../../job_creator_context';
import { Description } from './description';
import { MMLCallout } from '../mml_callout';
import { ML_JOB_AGGREGATION } from '../../../../../../../../../../../common/constants/aggregation_types';
import { isCategorizationJobCreator } from '../../../../../../../common/job_creator';

export const ModelPlotSwitch: FC = () => {
  const { jobCreator, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const [modelPlotEnabled, setModelPlotEnabled] = useState(jobCreator.modelPlot);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    jobCreator.modelPlot = modelPlotEnabled;
    jobCreatorUpdate();
  }, [modelPlotEnabled]);

  useEffect(() => {
    const aggs = [ML_JOB_AGGREGATION.RARE];
    // disable model plot switch if the wizard is creating a categorization job
    // and a rare detector is being used.
    const isRareCategoryJob =
      isCategorizationJobCreator(jobCreator) &&
      jobCreator.aggregations.some((agg) => aggs.includes(agg.id));
    setEnabled(isRareCategoryJob === false);
  }, [jobCreatorUpdated]);

  function toggleModelPlot() {
    setModelPlotEnabled(!modelPlotEnabled);
  }

  return (
    <>
      <Description>
        <EuiSwitch
          name="switch"
          disabled={enabled === false}
          checked={modelPlotEnabled}
          onChange={toggleModelPlot}
          data-test-subj="mlJobWizardSwitchModelPlot"
          label={i18n.translate(
            'xpack.ml.newJob.wizard.jobDetailsStep.advancedSection.enableModelPlot.title',
            {
              defaultMessage: 'Enable model plot',
            }
          )}
        />
      </Description>
      <MMLCallout />
      <EuiSpacer />
    </>
  );
};
