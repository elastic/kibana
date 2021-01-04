/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SwimlaneConfig, SwimlaneFieldMappingConfig, SwimlaneSecrets } from '../types';
import { IErrorObject, UserConfiguredActionConnector } from '../../../../../types';

export interface StepProps {
  action: UserConfiguredActionConnector<SwimlaneConfig, SwimlaneSecrets>;
  editActionConfig: (property: string, value: any) => void;
  editActionSecrets: (property: string, value: any) => void;
  errors: IErrorObject;
  readOnly: boolean;
  updateCurrentStep: (step: number) => void;
  updateFields: (items: SwimlaneFieldMappingConfig[]) => void;
  fields: SwimlaneFieldMappingConfig[];
}

export { SwimlaneConnection } from './swimlane_connection';
export { SwimlaneFields } from './swimlane_fields';
