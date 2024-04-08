/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Notebook } from './types';

export const INTRODUCTION_NOTEBOOK: Notebook = {
  id: 'introduction',
  title: i18n.translate('xpack.searchNotebooks.introductionNotebook.title', {
    defaultMessage: 'What are Notebooks?',
  }),
  description: i18n.translate('xpack.searchNotebooks.introductionNotebook.description', {
    defaultMessage: 'This is a description for the introduction notebook',
  }),
  notebook: {
    cells: [
      {
        cell_type: 'markdown',
        source: ['# What are Notebooks', 'Notebooks are lorem ipsum....'],
      },
      {
        cell_type: 'code',
        source: ['print("Hello world!!!")'],
      },
    ],
  },
};
