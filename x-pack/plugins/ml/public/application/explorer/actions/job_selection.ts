/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from } from 'rxjs';
import { map } from 'rxjs/operators';

import { mlFieldFormatService } from '../../services/field_format_service';
import { mlJobService } from '../../services/job_service';

import { EXPLORER_ACTION } from '../explorer_constants';
import { createJobs } from '../explorer_utils';

export function jobSelectionActionCreator(selectedJobIds: string[]) {
  return from(mlFieldFormatService.populateFormats(selectedJobIds)).pipe(
    map((resp) => {
      if (resp.error) {
        return null;
      }

      const jobs = createJobs(mlJobService.jobs).map((job) => {
        job.selected = selectedJobIds.some((id) => job.id === id);
        return job;
      });

      const selectedJobs = jobs.filter((job) => job.selected);

      return {
        type: EXPLORER_ACTION.JOB_SELECTION_CHANGE,
        payload: {
          loading: false,
          selectedJobs,
        },
      };
    })
  );
}
