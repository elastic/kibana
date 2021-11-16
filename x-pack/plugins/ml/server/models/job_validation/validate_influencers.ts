/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CombinedJob } from '../../../common/types/anomaly_detection_jobs';

import { validateJobObject } from './validate_job_object';

const INFLUENCER_LOW_THRESHOLD = 0;
const INFLUENCER_HIGH_THRESHOLD = 4;
const DETECTOR_FIELD_NAMES_THRESHOLD = 1;

export async function validateInfluencers(job: CombinedJob) {
  validateJobObject(job);

  const messages = [];
  const influencers = job.analysis_config.influencers;

  const detectorFieldNames: string[] = [];
  job.analysis_config.detectors.forEach((d) => {
    if (d.by_field_name) {
      detectorFieldNames.push(d.by_field_name);
    }
    if (d.over_field_name) {
      detectorFieldNames.push(d.over_field_name);
    }
    if (d.partition_field_name) {
      detectorFieldNames.push(d.partition_field_name);
    }
  });

  // if there's one detector but no by/over/partition field,
  // then we skip further influencer checks.
  // for example, the simple job wizard might create a job with a
  // detector using 'count' and no influencers and there shouldn't
  // be a warning about that.
  if (
    influencers?.length === 0 &&
    job.analysis_config.detectors.length === 1 &&
    detectorFieldNames.length === 0
  ) {
    return Promise.resolve([]);
  }

  if (
    // @ts-expect-error influencers is optional
    influencers.length <= INFLUENCER_LOW_THRESHOLD &&
    detectorFieldNames.length >= DETECTOR_FIELD_NAMES_THRESHOLD
  ) {
    let influencerSuggestion = `"${detectorFieldNames[0]}"`;
    let id = 'influencer_low_suggestion';

    if (detectorFieldNames.length > 1) {
      id = 'influencer_low_suggestions';
      const uniqueInfluencers = [...new Set(detectorFieldNames)];
      influencerSuggestion = `[${uniqueInfluencers.map((i) => `"${i}"`).join(',')}]`;
    }

    messages.push({ id, influencerSuggestion });
    // @ts-expect-error influencers is optional
  } else if (influencers.length <= INFLUENCER_LOW_THRESHOLD) {
    messages.push({ id: 'influencer_low' });
    // @ts-expect-error influencers is optional
  } else if (influencers.length >= INFLUENCER_HIGH_THRESHOLD) {
    messages.push({ id: 'influencer_high' });
  }

  if (messages.length === 0) {
    messages.push({ id: 'success_influencers' });
  }

  return Promise.resolve(messages);
}
