/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CaseBaseOptionalFields,
  ConnectorTypeFields,
  TemplateConfiguration,
} from '../../../common/types/domain';

export type CaseFieldsProps = Omit<
  CaseBaseOptionalFields,
  'customFields' | 'connector' | 'settings'
> & {
  customFields?: Record<string, string | boolean>;
  connectorId?: string;
  fields?: ConnectorTypeFields['fields'];
  syncAlerts?: boolean;
};

export type TemplateFormProps = Pick<TemplateConfiguration, 'key' | 'name'> &
  CaseFieldsProps & {
    templateTags?: string[];
    templateDescription?: string;
  };
