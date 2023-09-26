/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';
import userEvent, { specialChars } from '@testing-library/user-event';

import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Description } from './description';
import type { FormProps } from './schema';
import { schema } from './schema';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { MAX_DESCRIPTION_LENGTH } from '../../../common/constants';

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
    appMockRender.render(
      <MockHookWrapperComponent>
        <Description {...defaultProps} />
      </MockHookWrapperComponent>
    );

    expect(screen.getByTestId('caseDescription')).toBeInTheDocument();
  });

  it('it changes the description', async () => {
    appMockRender.render(
      <MockHookWrapperComponent>
        <Description {...defaultProps} />
      </MockHookWrapperComponent>
    );

    const description = screen.getByTestId('euiMarkdownEditorTextArea');

    userEvent.type(
      description,
      `${specialChars.selectAll}${specialChars.delete}My new description`
    );

    await waitFor(() => {
      expect(globalForm.getFormData()).toEqual({ description: 'My new description' });
    });
  });

  it('shows an error when description is empty', async () => {
    appMockRender.render(
      <MockHookWrapperComponent>
        <Description {...defaultProps} />
      </MockHookWrapperComponent>
    );

    const description = screen.getByTestId('euiMarkdownEditorTextArea');

    userEvent.clear(description);
    userEvent.type(description, '  ');

    await waitFor(() => {
      expect(screen.getByText('A description is required.')).toBeInTheDocument();
    });
  });

  it('shows an error when description is too long', async () => {
    const longDescription = 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1);

    appMockRender.render(
      <MockHookWrapperComponent>
        <Description {...defaultProps} />
      </MockHookWrapperComponent>
    );

    const description = screen.getByTestId('euiMarkdownEditorTextArea');

    userEvent.paste(description, longDescription);

    await waitFor(() => {
      expect(
        screen.getByText(
          'The length of the description is too long. The maximum length is 30000 characters.'
        )
      ).toBeInTheDocument();
    });
  });
});
