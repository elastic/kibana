/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Tags } from './tags';
import { schema } from '../create/schema';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, TestProviders } from '../../common/mock';
import { useGetTags } from '../../containers/use_get_tags';
import { MAX_LENGTH_PER_TAG } from '../../../common/constants';
import type { CaseFormFieldsSchemaProps } from './schema';

jest.mock('../../common/lib/kibana');
jest.mock('../../containers/use_get_tags');

const useGetTagsMock = useGetTags as jest.Mock;

describe('Tags', () => {
  let globalForm: FormHook;
  let appMockRender: AppMockRenderer;

  const MockHookWrapperComponent: FC<PropsWithChildren<unknown>> = ({ children }) => {
    const { form } = useForm<CaseFormFieldsSchemaProps>({
      defaultValue: { tags: [] },
      schema: {
        tags: schema.tags,
      },
    });

    globalForm = form;

    return (
      <TestProviders>
        <Form form={form}>{children}</Form>
      </TestProviders>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useGetTagsMock.mockReturnValue({ data: ['test'] });
    appMockRender = createAppMockRenderer();
  });

  it('it renders', async () => {
    appMockRender.render(
      <MockHookWrapperComponent>
        <Tags isLoading={false} />
      </MockHookWrapperComponent>
    );

    await waitFor(() => {
      expect(screen.getByTestId('caseTags')).toBeInTheDocument();
    });
  });

  it('it changes the tags', async () => {
    appMockRender.render(
      <MockHookWrapperComponent>
        <Tags isLoading={false} />
      </MockHookWrapperComponent>
    );

    await userEvent.type(screen.getByRole('combobox'), 'test{enter}');
    await userEvent.type(screen.getByRole('combobox'), 'case{enter}');

    expect(globalForm.getFormData()).toEqual({ tags: ['test', 'case'] });
  });

  it('it shows error when tag is empty', async () => {
    appMockRender.render(
      <MockHookWrapperComponent>
        <Tags isLoading={false} />
      </MockHookWrapperComponent>
    );

    await userEvent.type(screen.getByRole('combobox'), ' {enter}');

    await waitFor(() => {
      expect(screen.getByText('A tag must contain at least one non-space character.'));
    });
  });

  it('it shows error when tag is too long', async () => {
    const longTag = 'z'.repeat(MAX_LENGTH_PER_TAG + 1);

    appMockRender.render(
      <MockHookWrapperComponent>
        <Tags isLoading={false} />
      </MockHookWrapperComponent>
    );

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.paste(`${longTag}`);
    await userEvent.keyboard('{enter}');

    await waitFor(() => {
      expect(
        screen.getByText('The length of the tag is too long. The maximum length is 256 characters.')
      );
    });
  });
});
