/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { JobCreatorContext } from '../../../job_creator_context';
import { EVENT_RATE_FIELD_ID } from '../../../../../../../../../common/types/fields';
import { BucketSpanEstimatorData } from '../../../../../../../../../common/types/job_service';
import {
  isMultiMetricJobCreator,
  isPopulationJobCreator,
  isAdvancedJobCreator,
  isRareJobCreator,
} from '../../../../../common/job_creator';
import { ml } from '../../../../../../../services/ml_api_service';
import { useMlContext } from '../../../../../../../contexts/ml';
import { getToastNotificationService } from '../../../../../../../services/toast_notification_service';

export enum ESTIMATE_STATUS {
  NOT_RUNNING,
  RUNNING,
}

export function useEstimateBucketSpan() {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);
  const mlContext = useMlContext();

  const [status, setStatus] = useState(ESTIMATE_STATUS.NOT_RUNNING);

  const data: BucketSpanEstimatorData = {
    aggTypes: jobCreator.aggregations.map((a) => a.dslName),
    duration: {
      start: jobCreator.start,
      end: jobCreator.end,
    },
    fields: jobCreator.fields.map((f) => (f.id === EVENT_RATE_FIELD_ID ? null : f.id)),
    index: mlContext.currentDataView.title,
    query: mlContext.combinedQuery,
    splitField: undefined,
    timeField: mlContext.currentDataView.timeFieldName,
    runtimeMappings: jobCreator.runtimeMappings ?? undefined,
    indicesOptions: jobCreator.datafeedConfig.indices_options,
  };

  if (isMultiMetricJobCreator(jobCreator) && jobCreator.splitField !== null) {
    data.splitField = jobCreator.splitField.id;
  } else if (isPopulationJobCreator(jobCreator) && jobCreator.populationField !== null) {
    data.splitField = jobCreator.populationField.id;
  } else if (isRareJobCreator(jobCreator)) {
    data.fields = [null];
    if (jobCreator.populationField) {
      data.splitField = jobCreator.populationField.id;
    } else {
      data.splitField = jobCreator.rareField?.id;
    }
  } else if (isAdvancedJobCreator(jobCreator)) {
    jobCreator.richDetectors.some((d) => {
      if (d.partitionField !== null) {
        data.splitField = d.partitionField.id;
        return true;
      }
      if (d.overField !== null) {
        data.splitField = d.overField.id;
        return true;
      }
      if (d.byField !== null) {
        data.splitField = d.byField.id;
        return true;
      }
    });
  }

  async function estimateBucketSpan() {
    setStatus(ESTIMATE_STATUS.RUNNING);
    const { name, error, message: text } = await ml.estimateBucketSpan(data);
    setStatus(ESTIMATE_STATUS.NOT_RUNNING);
    if (error === true) {
      const title = i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.bucketSpanEstimator.errorTitle',
        {
          defaultMessage: 'Bucket span could not be estimated',
        }
      );
      getToastNotificationService().displayWarningToast({ title, text });
    } else {
      jobCreator.bucketSpan = name;
      jobCreatorUpdate();
    }
  }
  return { status, estimateBucketSpan };
}
