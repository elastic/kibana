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
    defaultMessage: 'What are Jupyter Notebooks?',
  }),
  description: i18n.translate('xpack.searchNotebooks.introductionNotebook.description', {
    defaultMessage:
      'Jupyter notebooks are an open-source document format for sharing live code examples with narrative text.',
  }),
  notebook: {
    cells: [
      {
        cell_type: 'markdown',
        source: [
          '# What are Jupyter Notebooks\n',
          '\n',
          'Jupyter Notebooks are an innovative tool that utilizes code, computation output and rich text into a single interactive document. They serve as a versatile platform for data analysis, scientific research and educational purposes.',
        ],
      },
      {
        cell_type: 'code',
        source: ['print("Hello world!!!")'],
      },
    ],
  },
};
