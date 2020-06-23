/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useState } from 'react';

import { JobCreatorContext } from '../../../job_creator_context';
import { EVENT_RATE_FIELD_ID } from '../../../../../../../../../common/types/fields';
import {
  isMultiMetricJobCreator,
  isPopulationJobCreator,
  isAdvancedJobCreator,
} from '../../../../../common/job_creator';
import { ml, BucketSpanEstimatorData } from '../../../../../../../services/ml_api_service';
import { useMlContext } from '../../../../../../../contexts/ml';
import { mlMessageBarService } from '../../../../../../../components/messagebar';

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
    index: mlContext.currentIndexPattern.title,
    query: mlContext.combinedQuery,
    splitField: undefined,
    timeField: mlContext.currentIndexPattern.timeFieldName,
  };

  if (
    (isMultiMetricJobCreator(jobCreator) || isPopulationJobCreator(jobCreator)) &&
    jobCreator.splitField !== null
  ) {
    data.splitField = jobCreator.splitField.id;
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
    const { name, error, message } = await ml.estimateBucketSpan(data);
    setStatus(ESTIMATE_STATUS.NOT_RUNNING);
    if (error === true) {
      mlMessageBarService.notify.error(message);
    } else {
      jobCreator.bucketSpan = name;
      jobCreatorUpdate();
    }
  }
  return { status, estimateBucketSpan };
}
