/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateJobFn, CreateJobFnFactory } from '../../../types';
import { validateUrls } from '../../common';
import { JobParamsPDF, TaskPayloadPDF } from '../types';

export const createJobFnFactory: CreateJobFnFactory<CreateJobFn<JobParamsPDF, TaskPayloadPDF>> =
  function createJobFactoryFn() {
    return async function createJobFn(
      { relativeUrls, ...jobParams }: JobParamsPDF // relativeUrls does not belong in the payload of PDFV1
    ) {
      validateUrls(relativeUrls);

      // return the payload
      return {
        ...jobParams,
        forceNow: new Date().toISOString(),
        objects: relativeUrls.map((u) => ({ relativeUrl: u })),
      };
    };
  };
