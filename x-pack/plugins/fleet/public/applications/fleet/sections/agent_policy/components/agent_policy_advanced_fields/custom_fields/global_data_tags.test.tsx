/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, fireEvent, act } from '@testing-library/react';

import type { GlobalDataTag } from '../../../../../../../../common/types';

import { GlobalDataTagsTable } from './global_data_tags_table';

describe('GlobalDataTagsTable', () => {
  let renderResult: RenderResult;
  let mockUpdateAgentPolicy: jest.Mock;
  const initialTags: GlobalDataTag[] = [
    { name: 'tag1', value: 'value1' },
    { name: 'tag2', value: 'value2' },
  ];

  const renderComponent = async (tags: GlobalDataTag[]) => {
    mockUpdateAgentPolicy = jest.fn();
    await act(async () => {
      renderResult = render(
        <GlobalDataTagsTable updateAgentPolicy={mockUpdateAgentPolicy} initialTags={tags} />
      );
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render initial tags', async () => {
    await renderComponent(initialTags);
    initialTags.forEach((tag) => {
      expect(renderResult.getByText(tag.name)).toBeInTheDocument();
      expect(renderResult.getByText(tag.value)).toBeInTheDocument();
    });
  });

  it('should add a new tag', async () => {
    await renderComponent([]);

    await act(async () => {
      fireEvent.click(renderResult.getByText('Add field'));
    });

    const nameInput = renderResult.getByPlaceholderText('Enter name');
    const valueInput = renderResult.getByPlaceholderText('Enter value');

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'newTag' } });
    });
    await act(async () => {
      fireEvent.change(valueInput, { target: { value: 'newValue' } });
    });

    await act(async () => {
      fireEvent.click(renderResult.getByLabelText('Confirm'));
    });

    expect(mockUpdateAgentPolicy).toHaveBeenCalledWith({
      global_data_tags: [{ name: 'newTag', value: 'newValue' }],
    });
  });

  it('should edit an existing tag', async () => {
    await renderComponent(initialTags);

    await act(async () => {
      fireEvent.click(renderResult.getAllByLabelText('Edit')[0]);
    });

    const nameInput = renderResult.getByPlaceholderText('Enter name');
    const valueInput = renderResult.getByPlaceholderText('Enter value');

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'updatedTag1' } });
    });
    await act(async () => {
      fireEvent.change(valueInput, { target: { value: 'updatedValue1' } });
    });

    await act(async () => {
      fireEvent.click(renderResult.getByLabelText('Confirm'));
    });

    expect(mockUpdateAgentPolicy).toHaveBeenCalledWith({
      global_data_tags: [{ name: 'updatedTag1', value: 'updatedValue1' }, initialTags[1]],
    });
  });

  it('should show validation errors for empty name and value', async () => {
    await renderComponent(initialTags);

    await act(async () => {
      fireEvent.click(renderResult.getByText('Add another field'));
    });

    await act(async () => {
      fireEvent.click(renderResult.getByLabelText('Confirm'));
    });

    expect(renderResult.getByText('Name cannot be empty')).toBeInTheDocument();
    expect(renderResult.getByText('Value cannot be empty')).toBeInTheDocument();
  });

  it('should delete a tag', async () => {
    await renderComponent(initialTags);

    await act(async () => {
      fireEvent.click(renderResult.getAllByLabelText('Delete')[0]);
    });

    await act(async () => {
      fireEvent.click(renderResult.getByText('Remove'));
    });

    expect(mockUpdateAgentPolicy).toHaveBeenCalledWith({
      global_data_tags: [initialTags[1]],
    });
  });

  it('should show validation errors for duplicate tag names', async () => {
    await renderComponent(initialTags);

    await act(async () => {
      fireEvent.click(renderResult.getByText('Add another field'));
    });

    const nameInput = renderResult.getByPlaceholderText('Enter name');
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'tag1' } });
    });

    await act(async () => {
      fireEvent.click(renderResult.getByLabelText('Confirm'));
    });

    expect(renderResult.getByText('Name must be unique')).toBeInTheDocument();
  });

  it('should cancel adding a new tag', async () => {
    await renderComponent(initialTags);

    await act(async () => {
      fireEvent.click(renderResult.getByText('Add another field'));
    });

    await act(async () => {
      fireEvent.click(renderResult.getByLabelText('Cancel'));
    });

    expect(renderResult.queryByPlaceholderText('Enter name')).not.toBeInTheDocument();
    expect(renderResult.queryByPlaceholderText('Enter value')).not.toBeInTheDocument();
  });

  it('should cancel editing a tag', async () => {
    await renderComponent(initialTags);

    await act(async () => {
      fireEvent.click(renderResult.getAllByLabelText('Edit')[0]);
    });

    await act(async () => {
      fireEvent.click(renderResult.getByLabelText('Cancel'));
    });

    expect(renderResult.queryByPlaceholderText('Enter name')).not.toBeInTheDocument();
    expect(renderResult.queryByPlaceholderText('Enter value')).not.toBeInTheDocument();
  });

  it('should allow multiple tags to be in "edit" state concurrently', async () => {
    await renderComponent(initialTags);

    // Enter edit mode for the first tag
    await act(async () => {
      fireEvent.click(renderResult.getAllByLabelText('Edit')[0]);
    });

    const nameInput1 = renderResult.getByDisplayValue('tag1');
    const valueInput1 = renderResult.getByDisplayValue('value1');

    await act(async () => {
      fireEvent.change(nameInput1, { target: { value: 'updatedTag1' } });
    });
    await act(async () => {
      fireEvent.change(valueInput1, { target: { value: 'updatedValue1' } });
    });

    // Enter edit mode for the second tag without saving the first one
    await act(async () => {
      fireEvent.click(renderResult.getByLabelText('Edit'));
    });

    const nameInput2 = renderResult.getByDisplayValue('tag2');
    const valueInput2 = renderResult.getByDisplayValue('value2');

    await act(async () => {
      fireEvent.change(nameInput2, { target: { value: 'updatedTag2' } });
    });
    await act(async () => {
      fireEvent.change(valueInput2, { target: { value: 'updatedValue2' } });
    });

    // Confirm changes for both tags
    await act(async () => {
      fireEvent.click(renderResult.getAllByLabelText('Confirm')[0]);
    });
    await act(async () => {
      fireEvent.click(renderResult.getByLabelText('Confirm'));
    });

    expect(mockUpdateAgentPolicy).toHaveBeenCalledWith({
      global_data_tags: [
        { name: 'updatedTag1', value: 'updatedValue1' },
        { name: 'updatedTag2', value: 'updatedValue2' },
      ],
    });
  });
});
