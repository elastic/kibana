/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TemplateDeserialized } from '../../../../common';

export interface StepProps {
  template?: TemplateDeserialized;
  setDataGetter: (dataGetter: DataGetterFunc) => void;
  updateCurrentStep: (step: number) => void;
  onStepValidityChange: (isValid: boolean | undefined) => void;
  isEditing?: boolean;
}

export type DataGetterFunc = () => Promise<{
  /** Is the step data valid or not */
  isValid: boolean;
  /** The current step data (can be invalid) */
  data: any;
  /** Optional "slice" of the complete object the step is updating  */
  path?: string;
}>;
