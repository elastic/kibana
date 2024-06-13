/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Tags } from './tags';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { useGetTags } from '../../containers/use_get_tags';
import { MAX_LENGTH_PER_TAG } from '../../../common/constants';
import { FormTestComponent } from '../../common/test_utils';

jest.mock('../../common/lib/kibana');
jest.mock('../../containers/use_get_tags');

const useGetTagsMock = useGetTags as jest.Mock;

describe('Tags', () => {
  let appMockRender: AppMockRenderer;
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useGetTagsMock.mockReturnValue({ data: ['test'] });
    appMockRender = createAppMockRenderer();
  });

  it('it renders', async () => {
    appMockRender.render(
      <FormTestComponent formDefaultValue={{ tags: [] }}>
        <Tags isLoading={false} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseTags')).toBeInTheDocument();
  });

  it('it renders existing tags when provided', async () => {
    appMockRender.render(
      <FormTestComponent formDefaultValue={{ tags: ['foo', 'bar'] }}>
        <Tags isLoading={false} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseTags')).toBeInTheDocument();
    expect(await screen.findByText('foo')).toBeInTheDocument();
    expect(await screen.findByText('bar')).toBeInTheDocument();
  });

  it('it changes the tags', async () => {
    appMockRender.render(
      <FormTestComponent formDefaultValue={{ tags: [] }} onSubmit={onSubmit}>
        <Tags isLoading={false} />
      </FormTestComponent>
    );

    userEvent.type(await screen.findByRole('combobox'), 'test{enter}');
    userEvent.type(await screen.findByRole('combobox'), 'case{enter}');

    userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ tags: ['test', 'case'] }, true);
    });
  });

  it('it adds the tags to existing array', async () => {
    appMockRender.render(
      <FormTestComponent formDefaultValue={{ tags: ['foo', 'bar'] }} onSubmit={onSubmit}>
        <Tags isLoading={false} />
      </FormTestComponent>
    );

    userEvent.paste(await screen.findByRole('combobox'), 'dude');
    userEvent.keyboard('{enter}');

    userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ tags: ['foo', 'bar', 'dude'] }, true);
    });
  });

  it('it shows error when tag is empty', async () => {
    appMockRender.render(
      <FormTestComponent formDefaultValue={{ tags: [] }} onSubmit={onSubmit}>
        <Tags isLoading={false} />
      </FormTestComponent>
    );

    userEvent.type(screen.getByRole('combobox'), ' ');
    userEvent.keyboard('enter');

    userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ data: {} }, false);
    });

    expect(await screen.findByText('A tag must contain at least one non-space character.'));
  });

  it('it shows error when tag is too long', async () => {
    const longTag = 'z'.repeat(MAX_LENGTH_PER_TAG + 1);

    appMockRender.render(
      <FormTestComponent formDefaultValue={{ tags: [longTag] }} onSubmit={onSubmit}>
        <Tags isLoading={false} />
      </FormTestComponent>
    );

    // userEvent.paste(screen.getByRole('combobox'), `${longTag}`);
    // userEvent.keyboard('{enter}');

    userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ data: { tags: [longTag] } }, false);
    });

    expect(
      await screen.findByText(
        'The length of the tag is too long. The maximum length is 256 characters.'
      )
    );
  });
});
