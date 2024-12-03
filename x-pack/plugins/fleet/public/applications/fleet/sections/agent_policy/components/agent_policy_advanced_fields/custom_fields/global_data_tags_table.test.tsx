/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { RenderResult } from '@testing-library/react';
import { fireEvent, act } from '@testing-library/react';

import { createFleetTestRendererMock, type TestRenderer } from '../../../../../../../mock';
import type { GlobalDataTag } from '../../../../../../../../common/types';

import { GlobalDataTagsTable } from './global_data_tags_table';

jest.mock('../../../../../../../hooks/use_fleet_status', () => ({
  FleetStatusProvider: (props: any) => {
    return props.children;
  },
}));

const TEST_IDS = {
  NAME_INPUT: 'globalDataTagsNameInput',
  VALUE_INPUT: 'globalDataTagsValueInput',
};

describe('GlobalDataTagsTable', () => {
  let renderResult: RenderResult;
  let mockUpdateAgentPolicy: jest.Mock;
  const globalDataTags: GlobalDataTag[] = [
    { name: 'tag1', value: 'value1' },
    { name: 'tag2', value: 'value2' },
  ];
  let renderer: TestRenderer;

  const renderComponent = (tags: GlobalDataTag[], options?: { isDisabled?: boolean }) => {
    mockUpdateAgentPolicy = jest.fn();
    renderer = createFleetTestRendererMock();

    const TestComponent = () => {
      const [agentPolicy, _updateAgentPolicy] = React.useState({
        global_data_tags: tags,
      });

      const updateAgentPolicy = React.useCallback<
        React.ComponentProps<typeof GlobalDataTagsTable>['updateAgentPolicy']
      >((policy) => {
        mockUpdateAgentPolicy(policy);
        _updateAgentPolicy({ ...policy, global_data_tags: policy.global_data_tags ?? [] });
      }, []);

      return (
        <GlobalDataTagsTable
          updateAgentPolicy={updateAgentPolicy}
          globalDataTags={agentPolicy.global_data_tags}
          isDisabled={options?.isDisabled}
        />
      );
    };
    act(() => {
      renderResult = renderer.render(<TestComponent />);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render initial tags', async () => {
    renderComponent(globalDataTags);
    globalDataTags.forEach((tag) => {
      expect(renderResult.getByText(tag.name)).toBeInTheDocument();
      expect(renderResult.getByText(tag.value)).toBeInTheDocument();
    });
  });

  it('should add new tags', async () => {
    renderComponent([]);

    await act(async () => {
      fireEvent.click(renderResult.getByText('Add field'));
    });

    const nameInput = renderResult.getByTestId(TEST_IDS.NAME_INPUT);
    const valueInput = renderResult.getByTestId(TEST_IDS.VALUE_INPUT);

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'newTag' } });
    });
    await act(async () => {
      fireEvent.change(valueInput, { target: { value: '123' } });
    });

    await act(async () => {
      fireEvent.click(renderResult.getByLabelText('Confirm'));
    });

    expect(mockUpdateAgentPolicy).toHaveBeenCalledWith({
      global_data_tags: [{ name: 'newTag', value: 123 }],
    });

    await act(async () => {
      fireEvent.click(renderResult.getByText('Add another field'));
    });

    const nameInput2 = renderResult.getByTestId(TEST_IDS.NAME_INPUT);
    const valueInput2 = renderResult.getByTestId(TEST_IDS.VALUE_INPUT);

    await act(async () => {
      fireEvent.change(nameInput2, { target: { value: 'newTag2' } });
    });
    await act(async () => {
      fireEvent.change(valueInput2, { target: { value: '123 123' } });
    });

    await act(async () => {
      fireEvent.click(renderResult.getByLabelText('Confirm'));
    });

    expect(mockUpdateAgentPolicy).toHaveBeenCalledWith({
      global_data_tags: [
        { name: 'newTag', value: 123 },
        { name: 'newTag2', value: '123 123' },
      ],
    });
  }, 10000);

  it('should edit an existing tag', async () => {
    renderComponent(globalDataTags);

    await act(async () => {
      fireEvent.click(renderResult.getAllByLabelText('Edit')[0]);
    });

    const nameInput = renderResult.getByTestId(TEST_IDS.NAME_INPUT);
    const valueInput = renderResult.getByTestId(TEST_IDS.VALUE_INPUT);

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
      global_data_tags: [{ name: 'updatedTag1', value: 'updatedValue1' }, globalDataTags[1]],
    });
  });

  it('should show validation errors for empty name and value', async () => {
    renderComponent(globalDataTags);

    await act(async () => {
      fireEvent.click(renderResult.getByText('Add another field'));
    });

    await act(async () => {
      fireEvent.click(renderResult.getByLabelText('Confirm'));
    });

    expect(renderResult.getByText('Name cannot be empty')).toBeInTheDocument();
    expect(renderResult.getByText('Value cannot be empty')).toBeInTheDocument();
  });

  it('should delete a tag when confirming the modal', async () => {
    renderComponent(globalDataTags);
    renderer.startServices.overlays.openConfirm.mockResolvedValue(true);

    await act(async () => {
      fireEvent.click(renderResult.getAllByLabelText('Delete')[0]);
    });

    expect(mockUpdateAgentPolicy).toHaveBeenCalledWith({
      global_data_tags: [globalDataTags[1]],
    });
  });

  it('should not delete a tag when confirming the modal', async () => {
    renderComponent(globalDataTags);
    renderer.startServices.overlays.openConfirm.mockResolvedValue(false);

    await act(async () => {
      fireEvent.click(renderResult.getAllByLabelText('Delete')[0]);
    });

    expect(mockUpdateAgentPolicy).not.toHaveBeenCalledWith({
      global_data_tags: [globalDataTags[1]],
    });
  });

  it('should show validation errors for duplicate tag names', async () => {
    renderComponent(globalDataTags);

    act(() => {
      fireEvent.click(renderResult.getByText('Add another field'));
    });

    const nameInput = renderResult.getByTestId(TEST_IDS.NAME_INPUT);
    act(() => {
      fireEvent.change(nameInput, { target: { value: globalDataTags[0].name } });
    });

    act(() => {
      fireEvent.click(renderResult.getByLabelText('Confirm'));
    });

    expect(renderResult.getByText('Name must be unique')).toBeInTheDocument();
  });

  it('should cancel adding a new tag', async () => {
    renderComponent(globalDataTags);

    await act(async () => {
      fireEvent.click(renderResult.getByText('Add another field'));
    });

    await act(async () => {
      fireEvent.click(renderResult.getByLabelText('Cancel'));
    });

    expect(renderResult.queryByTestId(TEST_IDS.NAME_INPUT)).not.toBeInTheDocument();
    expect(renderResult.queryByTestId(TEST_IDS.VALUE_INPUT)).not.toBeInTheDocument();
  });

  it('should cancel editing a tag', async () => {
    renderComponent(globalDataTags);

    await act(async () => {
      fireEvent.click(renderResult.getAllByLabelText('Edit')[0]);
    });

    await act(async () => {
      fireEvent.click(renderResult.getByLabelText('Cancel'));
    });

    expect(renderResult.queryByTestId(TEST_IDS.NAME_INPUT)).not.toBeInTheDocument();
    expect(renderResult.queryByTestId(TEST_IDS.VALUE_INPUT)).not.toBeInTheDocument();
  });

  it('should allow multiple tags to be in "edit" state concurrently', async () => {
    renderComponent(globalDataTags);

    // Enter edit mode for the first tag
    act(() => {
      fireEvent.click(renderResult.getAllByLabelText('Edit')[0]);
    });

    act(() => {
      const nameInput1 = renderResult.getByDisplayValue(globalDataTags[0].name);
      fireEvent.change(nameInput1, { target: { value: 'updatedTag1' } });
    });
    act(() => {
      const valueInput1 = renderResult.getByDisplayValue(globalDataTags[0].value);
      fireEvent.change(valueInput1, { target: { value: 'updatedValue1' } });
    });

    // Enter edit mode for the second tag without saving the first one
    act(() => {
      fireEvent.click(renderResult.getByLabelText('Edit'));
    });

    act(() => {
      const nameInput2 = renderResult.getByDisplayValue(globalDataTags[1].name);
      fireEvent.change(nameInput2, { target: { value: 'updatedTag2' } });
    });

    act(() => {
      const valueInput2 = renderResult.getByDisplayValue(globalDataTags[1].value);
      fireEvent.change(valueInput2, { target: { value: 'updatedValue2' } });
    });

    // Confirm changes for both tags
    act(() => {
      fireEvent.click(renderResult.getAllByLabelText('Confirm')[0]);
    });
    act(() => {
      fireEvent.click(renderResult.getByLabelText('Confirm'));
    });

    expect(mockUpdateAgentPolicy).toHaveBeenCalledWith({
      global_data_tags: [
        { name: 'updatedTag1', value: 'updatedValue1' },
        { name: 'updatedTag2', value: 'updatedValue2' },
      ],
    });
  });

  it('should not allow to add tag when disabled and no tags exists', () => {
    renderComponent([], { isDisabled: true });

    const test = renderResult.getByTestId('globalDataTagAddFieldBtn');
    expect(test).toBeDisabled();
  });

  it('should not allow to add/edit/remove tag when disabled and tags already exists', () => {
    renderComponent(globalDataTags, { isDisabled: true });

    expect(renderResult.getByTestId('globalDataTagAddAnotherFieldBtn')).toBeDisabled();
    expect(renderResult.getByTestId('globalDataTagDeleteField1Btn')).toBeDisabled();
    expect(renderResult.getByTestId('globalDataTagEditField1Btn')).toBeDisabled();
  });
});
