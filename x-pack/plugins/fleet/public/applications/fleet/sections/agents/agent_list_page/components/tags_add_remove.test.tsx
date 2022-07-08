/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { useUpdateTags } from '../hooks';

import { TagsAddRemove } from './tags_add_remove';

jest.mock('../hooks', () => ({
  useUpdateTags: jest.fn().mockReturnValue({
    updateTags: jest.fn(),
    bulkUpdateTags: jest.fn(),
  }),
}));

describe('TagsAddRemove', () => {
  let allTags: string[];
  let selectedTags: string[];
  const button = document.createElement('button');
  const onTagsUpdated = jest.fn();
  const mockUpdateTags = useUpdateTags().updateTags as jest.Mock;
  const mockBulkUpdateTags = useUpdateTags().bulkUpdateTags as jest.Mock;

  beforeEach(() => {
    onTagsUpdated.mockReset();
    mockUpdateTags.mockReset();
    mockBulkUpdateTags.mockReset();
    allTags = ['tag1', 'tag2'];
    selectedTags = ['tag1'];
  });

  const renderComponent = (agentId?: string, agents?: string | string[]) => {
    return render(
      <TagsAddRemove
        agentId={agentId}
        agents={agents}
        allTags={allTags}
        selectedTags={selectedTags}
        button={button}
        onTagsUpdated={onTagsUpdated}
      />
    );
  };

  it('should add selected tag when previously unselected', async () => {
    mockUpdateTags.mockImplementation(() => {
      selectedTags = ['tag1', 'tag2'];
    });
    const result = renderComponent('agent1');
    const getTag = (name: string) => result.getByText(name);

    fireEvent.click(getTag('tag2'));

    expect(mockUpdateTags).toHaveBeenCalledWith(
      'agent1',
      ['tag1', 'tag2'],
      expect.anything(),
      undefined,
      undefined
    );
  });

  it('should remove selected tag when previously selected', async () => {
    mockUpdateTags.mockImplementation(() => {
      selectedTags = [];
    });
    const result = renderComponent('agent1');
    const getTag = (name: string) => result.getByText(name);

    fireEvent.click(getTag('tag1'));

    expect(mockUpdateTags).toHaveBeenCalledWith(
      'agent1',
      [],
      expect.anything(),
      undefined,
      undefined
    );
  });

  it('should add new tag when not found in search and button clicked', () => {
    const result = renderComponent('agent1');
    const searchInput = result.getByRole('combobox');

    fireEvent.input(searchInput, {
      target: { value: 'newTag' },
    });

    fireEvent.click(result.getAllByText('Create a new tag "newTag"')[0].closest('button')!);

    expect(mockUpdateTags).toHaveBeenCalledWith(
      'agent1',
      ['tag1', 'newTag'],
      expect.anything(),
      'Tag created',
      'Tag creation failed'
    );
  });

  it('should add selected tag when previously unselected - bulk selection', async () => {
    mockBulkUpdateTags.mockImplementation(() => {
      selectedTags = ['tag1', 'tag2'];
    });
    const result = renderComponent(undefined, '');
    const getTag = (name: string) => result.getByText(name);

    fireEvent.click(getTag('tag2'));

    expect(mockBulkUpdateTags).toHaveBeenCalledWith(
      '',
      ['tag2'],
      [],
      expect.anything(),
      undefined,
      undefined
    );
  });

  it('should remove selected tag when previously selected - bulk selection', async () => {
    mockBulkUpdateTags.mockImplementation(() => {
      selectedTags = [];
    });
    const result = renderComponent(undefined, ['agent1', 'agent2']);
    const getTag = (name: string) => result.getByText(name);

    fireEvent.click(getTag('tag1'));

    expect(mockBulkUpdateTags).toHaveBeenCalledWith(
      ['agent1', 'agent2'],
      [],
      ['tag1'],
      expect.anything(),
      undefined,
      undefined
    );
  });

  it('should add new tag when not found in search and button clicked - bulk selection', () => {
    const result = renderComponent(undefined, 'query');
    const searchInput = result.getByRole('combobox');

    fireEvent.input(searchInput, {
      target: { value: 'newTag' },
    });

    fireEvent.click(result.getAllByText('Create a new tag "newTag"')[0].closest('button')!);

    expect(mockBulkUpdateTags).toHaveBeenCalledWith(
      'query',
      ['newTag'],
      [],
      expect.anything(),
      'Tag created',
      'Tag creation failed'
    );
  });

  it('should make tag options button visible on mouse enter', async () => {
    const result = renderComponent('agent1');

    fireEvent.mouseEnter(result.getByText('tag1').closest('.euiFlexGroup')!);

    expect(result.getByRole('button').getAttribute('aria-label')).toEqual('Tag Options');

    fireEvent.mouseLeave(result.getByText('tag1').closest('.euiFlexGroup')!);

    expect(result.queryByRole('button')).not.toBeInTheDocument();
  });
});
