/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { ES_CLIENT_DETAILS } from '../view_code_flyout';
import { CloudSetup } from '@kbn/cloud-plugin/public';
import { ChatForm } from '../../../types';
import { LANGCHAIN_PYTHON } from './py_langchain_python';

describe('PY_LANGCHAIN function', () => {
  test('renders with correct content', () => {
    // Mocking necessary values for your function
    const formValues = {
      elasticsearch_query: { query: {} },
      indices: ['index1', 'index2'],
      docSize: 10,
      source_fields: { index1: ['field1'], index2: ['field2'] },
      prompt: 'Your prompt',
      citations: true,
      summarization_model: 'Your-new-model',
    } as unknown as ChatForm;

    const clientDetails = ES_CLIENT_DETAILS({
      elasticsearchUrl: 'http://my-local-cloud-instance',
    } as unknown as CloudSetup);

    const { container } = render(LANGCHAIN_PYTHON(formValues, clientDetails));

    expect(container.firstChild?.textContent).toMatchSnapshot();
  });
});
