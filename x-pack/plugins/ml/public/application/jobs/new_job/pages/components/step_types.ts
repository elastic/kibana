/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum WIZARD_STEPS {
  TIME_RANGE,
  ADVANCED_CONFIGURE_DATAFEED,
  PICK_FIELDS,
  JOB_DETAILS,
  VALIDATION,
  SUMMARY,
}

export interface StepProps {
  isCurrentStep: boolean;
  setCurrentStep: React.Dispatch<React.SetStateAction<WIZARD_STEPS>>;
}
