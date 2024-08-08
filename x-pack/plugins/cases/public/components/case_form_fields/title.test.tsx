/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { screen } from '@testing-library/react';

import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { CaseFormFieldsSchemaProps } from './schema';

import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import userEvent from '@testing-library/user-event';

import { Title } from './title';
import { schema } from '../create/schema';
import { createAppMockRenderer, type AppMockRenderer } from '../../common/mock';

describe('Title', () => {
  let globalForm: FormHook;
  let appMockRender: AppMockRenderer;

  const MockHookWrapperComponent: FC<PropsWithChildren<unknown>> = ({ children }) => {
    const { form } = useForm<CaseFormFieldsSchemaProps>({
      defaultValue: { title: 'My title' },
      schema: {
        title: schema.title,
      },
    });

    globalForm = form;

    return <Form form={form}>{children}</Form>;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('it renders', async () => {
    appMockRender.render(
      <MockHookWrapperComponent>
        <Title isLoading={false} />
      </MockHookWrapperComponent>
    );

    expect(await screen.findByTestId('caseTitle')).toBeInTheDocument();
  });

  it('it disables the input when loading', async () => {
    appMockRender.render(
      <MockHookWrapperComponent>
        <Title isLoading={true} />
      </MockHookWrapperComponent>
    );
    expect(await screen.findByTestId('input')).toBeDisabled();
  });

  it('it changes the title', async () => {
    appMockRender.render(
      <MockHookWrapperComponent>
        <Title isLoading={false} />
      </MockHookWrapperComponent>
    );

    userEvent.paste(await screen.findByTestId('input'), ' is updated');

    expect(globalForm.getFormData()).toEqual({ title: 'My title is updated' });
  });
});
