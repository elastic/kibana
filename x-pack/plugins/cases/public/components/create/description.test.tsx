/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Description } from './description';
import { schema } from './schema';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { MAX_DESCRIPTION_LENGTH } from '../../../common/constants';
import { FormTestComponent } from '../../common/test_utils';
import type { FormSchema } from '@kbn/index-management-plugin/public/shared_imports';

describe('Description', () => {
  let appMockRender: AppMockRenderer;
  const onSubmit = jest.fn();
  const draftStorageKey = `cases.caseView.createCase.description.markdownEditor`;
  const defaultProps = {
    draftStorageKey,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.removeItem(draftStorageKey);
  });

  it('it renders', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <Description {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseDescription')).toBeInTheDocument();
  });

  it('it changes the description', async () => {
    appMockRender.render(
      <FormTestComponent
        onSubmit={onSubmit}
        formDefaultValue={{
          title: 'Default title',
          tags: [],
        }}
      >
        <Description {...defaultProps} />
      </FormTestComponent>
    );

    const description = await screen.findByTestId('euiMarkdownEditorTextArea');

    userEvent.paste(description, 'My new description');

    userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({ description: 'My new description' }, true);
    });
  });

  it('shows an error when description is empty', async () => {
    appMockRender.render(
      <FormTestComponent
        onSubmit={onSubmit}
        formDefaultValue={{
          title: 'Default title',
          tags: [],
        }}
        schema={{ description: schema.description } as FormSchema}
      >
        <Description {...defaultProps} />
      </FormTestComponent>
    );

    const description = await screen.findByTestId('euiMarkdownEditorTextArea');

    userEvent.paste(description, '  ');

    userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({}, false);
    });

    expect(await screen.findByText('A description is required.')).toBeInTheDocument();
  });

  it('shows an error when description is too long', async () => {
    const longDescription = 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1);

    appMockRender.render(
      <FormTestComponent
        onSubmit={onSubmit}
        formDefaultValue={{
          title: 'Default title',
          tags: [],
        }}
        schema={{ description: schema.description } as FormSchema}
      >
        <Description {...defaultProps} />
      </FormTestComponent>
    );

    const description = await screen.findByTestId('euiMarkdownEditorTextArea');

    userEvent.paste(description, longDescription);

    userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({}, false);
    });

    expect(
      await screen.findByText(
        'The length of the description is too long. The maximum length is 30000 characters.'
      )
    ).toBeInTheDocument();
  });
});
