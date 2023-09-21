/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { CustomFieldTypes } from '../../../common/types/domain';
import type { CasesConfigurationUI, CaseUI } from '../../containers/types';

export interface CustomFieldType {
  Configure: React.FC;
  View: React.FC<{
    customField?: CaseUI['customFields'][number];
  }>;
  Edit: React.FC<{
    customField?: CaseUI['customFields'][number];
    customFieldConfiguration: CasesConfigurationUI['customFields'][number];
    onSubmit: (customField: CaseUI['customFields'][number]) => void;
    isLoading: boolean;
    canUpdate: boolean;
  }>;
}

export type CustomFieldFactory = () => {
  id: string;
  label: string;
  build: () => CustomFieldType;
};

export type CustomFieldBuilderMap = {
  readonly [key in CustomFieldTypes]: CustomFieldFactory;
};
