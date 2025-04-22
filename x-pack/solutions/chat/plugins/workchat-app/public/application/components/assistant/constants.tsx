/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ASSISTANT_USE_CASES = [
  {
    value: 'customerSupport',
    label: i18n.translate('workchatApp.assistants.editView.useCase.customerSupportLabel', {
      defaultMessage: 'Customer Support',
    }),
    description: i18n.translate(
      'workchatApp.assistants.editView.useCase.customerSupportDescription',
      {
        defaultMessage: 'Help customers with inquiries and support issues',
      }
    ),
    prompt:
      'You are a helpful customer support assistant. Provide clear, accurate, and friendly responses to customer inquiries. Focus on resolving issues efficiently while maintaining a professional tone.',
  },
  {
    value: 'dataAnalysis',
    label: i18n.translate('workchatApp.assistants.editView.useCase.dataAnalysisLabel', {
      defaultMessage: 'Data Analysis',
    }),
    description: i18n.translate('workchatApp.assistants.editView.useCase.dataAnalysisDescription', {
      defaultMessage: 'Analyze and interpret data to provide insights',
    }),
    prompt:
      'You are a data analysis assistant. Help users understand their data by identifying patterns, trends, and anomalies. Provide clear explanations of your findings and suggest actionable insights.',
  },
  {
    value: 'custom',
    label: i18n.translate('workchatApp.assistants.editView.useCase.customLabel', {
      defaultMessage: 'Custom',
    }),
    description: i18n.translate('workchatApp.assistants.editView.useCase.customDescription', {
      defaultMessage: 'Create a custom assistant for your specific needs',
    }),
    prompt: '',
  },
];
