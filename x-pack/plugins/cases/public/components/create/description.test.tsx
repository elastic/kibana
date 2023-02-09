/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import userEvent, { specialChars } from '@testing-library/user-event';

import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Description } from './description';
import type { FormProps } from './schema';
import { schema } from './schema';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';

jest.mock('../markdown_editor/plugins/lens/use_lens_draft_comment');

describe('Description', () => {
  let globalForm: FormHook;
  let appMockRender: AppMockRenderer;
  const draftStorageKey = `cases.caseView.createCase.description.markdownEditor`;
  const defaultProps = {
    draftStorageKey,
    isLoading: false,
  };

  const MockHookWrapperComponent: React.FC = ({ children }) => {
    const { form } = useForm<FormProps>({
      defaultValue: { description: 'My description' },
      schema: {
        description: schema.description,
      },
    });

    globalForm = form;

    return <Form form={form}>{children}</Form>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('it renders', async () => {
    const result = appMockRender.render(
      <MockHookWrapperComponent>
        <Description {...defaultProps} />
      </MockHookWrapperComponent>
    );

    expect(result.getByTestId('caseDescription')).toBeInTheDocument();
  });

  it('it changes the description', async () => {
    const result = appMockRender.render(
      <MockHookWrapperComponent>
        <Description {...defaultProps} />
      </MockHookWrapperComponent>
    );

    userEvent.type(
      result.getByRole('textbox'),
      `${specialChars.selectAll}${specialChars.delete}My new description`
    );

    await waitFor(() => {
      expect(globalForm.getFormData()).toEqual({ description: 'My new description' });
    });
  });
});
