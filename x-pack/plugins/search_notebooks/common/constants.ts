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
    defaultMessage: 'Jupyter notebooks',
  }),
  description: i18n.translate('xpack.searchNotebooks.introductionNotebook.description', {
    defaultMessage:
      'Learn all about Jupyter notebooks, how to preview them in the UI, and how to run them.',
  }),
  notebook: {
    cells: [
      {
        cell_type: 'markdown',
        source: [
          '# What are Jupyter notebooks?\n',
          '\n',
          'Jupyter Notebooks combine executable code and rich Markdown documentation in a single interactive document. Easy to run, edit and share, they enable collaboration in fields like data science, scientific computing, and machine learning.',
          '\n',
          '\n',
          'Notebooks are composed of cells, which can contain Markdown text like this, or Python code like the cell below.\n',
        ],
      },
      {
        cell_type: 'code',
        source: ['print("Hello world!!!")\n'],
      },
      {
        cell_type: 'markdown',
        source: [
          '\nNotebooks are a great way to test and prototype code, and share results with others. In our notebooks we use the official [Elasticsearch Python client](https://elasticsearch-py.readthedocs.io/en/latest/) to call the Elasticsearch APIs.',
        ],
      },
      {
        cell_type: 'markdown',
        source: [
          '## Elastic Jupyter notebooks\n',
          '\n',
          'You can **preview** a number of our Jupyter notebooks right here in the UI. Check out the next section for how to **run** notebooks.\n',
          '\nFind all of our available notebooks in the `elasticsearch-labs` [GitHub repository](https://github.com/elastic/elasticsearch-labs).',
          '\n',
          '## How to run notebooks\n',
          '\n',
          'You can run notebooks in two ways:',
          '\n',
          '- **Run in Colab**: You can run all our notebooks in Google [Colab](https://colab.research.google.com), a free, zero configuration, in-browser notebook execution environment. Just click the `Open in Colab` button at the top of a notebook to test it in Colab.\n',
          '- **Run locally**: You can also download the notebooks from the repository and run them locally using tools like [JupyterLab](https://jupyter.org/install).\n',
          '\n',
          'ℹ️ Just make sure to copy your **Elasticsearch endpoint and API key** so the notebook can run against your deployment.\n',
          '\n',
          '## Learn more\n',
          '\n',
          'Check out [Elastic Search Labs](https://www.elastic.co/search-labs) for all the latest advanced content for Elasticsearch users, including additional Python examples.',
        ],
      },
    ],
  },
};

export const DEFAULT_NOTEBOOK_ID = 'introduction';
