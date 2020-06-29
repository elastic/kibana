/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IErrorObject, ActionType } from '../../../../../types';

import {
  ActionType as ThirdPartySupportedActions,
  CaseField,
} from '../../../../../../../case/common/api';

export { ThirdPartyField as AllThirdPartyFields } from '../../../../../../../case/common/api';

export { ActionType, CaseField };

export interface ThirdPartyField {
  label: string;
  validSourceFields: CaseField[];
  defaultSourceField: CaseField;
  defaultActionType: ThirdPartySupportedActions;
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>;

export interface ConnectorFlyoutFormProps<T> {
  errors: IErrorObject;
  action: T;
  onChangeSecret: (key: string, value: string) => void;
  onBlurSecret: (key: string) => void;
  onChangeConfig: (key: string, value: string) => void;
  onBlurConfig: (key: string) => void;
}

export interface ConnectorFlyoutHOCProps<T> {
  ConnectorFormComponent: React.FC<ConnectorFlyoutFormProps<T>>;
  connectorActionTypeId: string;
  configKeys?: string[];
  secretKeys?: string[];
}
