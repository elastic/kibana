/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IconType } from '@elastic/eui';
import React from 'react';

import {
  ActionType as ThirdPartySupportedActions,
  CaseField,
  ConnectorTypeFields,
} from '../../../common/api';
import { CaseActionConnector } from '../types';

export type { ThirdPartyField as AllThirdPartyFields } from '../../../common/api';

export interface ThirdPartyField {
  label: string;
  validSourceFields: CaseField[];
  defaultSourceField: CaseField;
  defaultActionType: ThirdPartySupportedActions;
}

export interface ConnectorConfiguration {
  name: string;
  logo: IconType;
}

export interface CaseConnector<UIProps = unknown> {
  id: string;
  fieldsComponent: React.LazyExoticComponent<
    React.ComponentType<ConnectorFieldsProps<UIProps>>
  > | null;
}

export interface CaseConnectorsRegistry {
  has: (id: string) => boolean;
  register: <UIProps extends ConnectorTypeFields['fields']>(
    connector: CaseConnector<UIProps>
  ) => void;
  get: <UIProps extends ConnectorTypeFields['fields']>(id: string) => CaseConnector<UIProps>;
  list: () => CaseConnector[];
}

export interface ConnectorFieldsProps<TFields> {
  isEdit?: boolean;
  connector: CaseActionConnector;
  fields: TFields;
  onChange: (fields: TFields) => void;
}
