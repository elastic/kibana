/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SettingsItem {
  label: string;
  title: string;
  description: string;
  value: string;
  type: 'text' | 'file';
  helpText?: string;
}

export const settingsItems: SettingsItem[] = [
  {
    title: 'Logo',
    description: 'Customize Elastic with your custom logo',
    type: 'file',
    value: '',
    label: 'Select or drag/drop a file',
  },
  {
    title: 'Document title',
    description: 'Add a custom document title to append to your browser tab / window',
    type: 'text',
    value: '',
    label: '',
  },
  {
    title: 'Mark',
    description: 'Add a custom mark to display instead of elastic',
    type: 'file',
    value: '',
    label: 'Select or drag/drop a file',
  },
];
