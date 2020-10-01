/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import Boom from 'boom';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { ShareSavedObjectsToSpaceFlyout } from './share_to_space_flyout';
import { ShareToSpaceForm } from './share_to_space_form';
import { EuiLoadingSpinner, EuiEmptyPrompt } from '@elastic/eui';
import { Space } from '../../../common/model/space';
import { findTestSubject } from 'test_utils/find_test_subject';
import { SelectableSpacesControl } from './selectable_spaces_control';
import { act } from '@testing-library/react';
import { spacesManagerMock } from '../../spaces_manager/mocks';
import { SpacesManager } from '../../spaces_manager';
import { ToastsApi } from 'src/core/public';
import { EuiCallOut } from '@elastic/eui';
import { CopySavedObjectsToSpaceFlyout } from '../../copy_saved_objects_to_space/components';
import { SavedObjectsManagementRecord } from 'src/plugins/saved_objects_management/public';

interface SetupOpts {
  mockSpaces?: Space[];
  namespaces?: string[];
  returnBeforeSpacesLoad?: boolean;
}

const setup = async (opts: SetupOpts = {}) => {
  const onClose = jest.fn();
  const onObjectUpdated = jest.fn();

  const mockSpacesManager = spacesManagerMock.create();

  mockSpacesManager.getActiveSpace.mockResolvedValue({
    id: 'my-active-space',
    name: 'my active space',
    disabledFeatures: [],
  });

  mockSpacesManager.getSpaces.mockResolvedValue(
    opts.mockSpaces || [
      {
        id: 'space-1',
        name: 'Space 1',
        disabledFeatures: [],
      },
      {
        id: 'space-2',
        name: 'Space 2',
        disabledFeatures: [],
      },
      {
        id: 'space-3',
        name: 'Space 3',
        disabledFeatures: [],
      },
      {
        id: 'my-active-space',
        name: 'my active space',
        disabledFeatures: [],
      },
    ]
  );

  const mockToastNotifications = {
    addError: jest.fn(),
    addSuccess: jest.fn(),
  };
  const savedObjectToShare = {
    type: 'dashboard',
    id: 'my-dash',
    references: [
      {
        type: 'visualization',
        id: 'my-viz',
        name: 'My Viz',
      },
    ],
    meta: { icon: 'dashboard', title: 'foo' },
    namespaces: opts.namespaces || ['my-active-space', 'space-1'],
  } as SavedObjectsManagementRecord;

  const wrapper = mountWithIntl(
    <ShareSavedObjectsToSpaceFlyout
      savedObject={savedObjectToShare}
      spacesManager={(mockSpacesManager as unknown) as SpacesManager}
      toastNotifications={(mockToastNotifications as unknown) as ToastsApi}
      onClose={onClose}
      onObjectUpdated={onObjectUpdated}
    />
  );

  if (!opts.returnBeforeSpacesLoad) {
    // Wait for spaces manager to complete and flyout to rerender
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  return { wrapper, onClose, mockSpacesManager, mockToastNotifications, savedObjectToShare };
};

describe('ShareToSpaceFlyout', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  it('waits for spaces to load', async () => {
    const { wrapper } = await setup({ returnBeforeSpacesLoad: true });

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);
  });

  it('shows a message within an EuiEmptyPrompt when no spaces are available', async () => {
    const { wrapper, onClose } = await setup({ mockSpaces: [] });

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it('shows a message within an EuiEmptyPrompt when only the active space is available', async () => {
    const { wrapper, onClose } = await setup({
      mockSpaces: [{ id: 'my-active-space', name: '', disabledFeatures: [] }],
    });

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it('does not show a warning callout when the saved object has multiple namespaces', async () => {
    const { wrapper, onClose } = await setup();

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiCallOut)).toHaveLength(0);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it('shows a warning callout when the saved object only has one namespace', async () => {
    const { wrapper, onClose } = await setup({ namespaces: ['my-active-space'] });

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it('does not show the Copy flyout by default', async () => {
    const { wrapper, onClose } = await setup({ namespaces: ['my-active-space'] });

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(CopySavedObjectsToSpaceFlyout)).toHaveLength(0);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it('shows the Copy flyout if the the "Make a copy" button is clicked', async () => {
    const { wrapper, onClose } = await setup({ namespaces: ['my-active-space'] });

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);

    const copyButton = findTestSubject(wrapper, 'sts-copy-button'); // this button is only present in the warning callout

    await act(async () => {
      copyButton.simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(CopySavedObjectsToSpaceFlyout)).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it('handles errors thrown from shareSavedObjectsAdd API call', async () => {
    const { wrapper, mockSpacesManager, mockToastNotifications } = await setup();

    mockSpacesManager.shareSavedObjectAdd.mockImplementation(() => {
      return Promise.reject(Boom.serverUnavailable('Something bad happened'));
    });

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);

    // Using props callback instead of simulating clicks,
    // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
    const spaceSelector = wrapper.find(SelectableSpacesControl);
    act(() => {
      spaceSelector.props().onChange(['space-2', 'space-3']);
    });

    const startButton = findTestSubject(wrapper, 'sts-initiate-button');

    await act(async () => {
      startButton.simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(mockSpacesManager.shareSavedObjectAdd).toHaveBeenCalled();
    expect(mockSpacesManager.shareSavedObjectRemove).not.toHaveBeenCalled();
    expect(mockToastNotifications.addError).toHaveBeenCalled();
  });

  it('handles errors thrown from shareSavedObjectsRemove API call', async () => {
    const { wrapper, mockSpacesManager, mockToastNotifications } = await setup();

    mockSpacesManager.shareSavedObjectRemove.mockImplementation(() => {
      return Promise.reject(Boom.serverUnavailable('Something bad happened'));
    });

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);

    // Using props callback instead of simulating clicks,
    // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
    const spaceSelector = wrapper.find(SelectableSpacesControl);
    act(() => {
      spaceSelector.props().onChange(['space-2', 'space-3']);
    });

    const startButton = findTestSubject(wrapper, 'sts-initiate-button');

    await act(async () => {
      startButton.simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(mockSpacesManager.shareSavedObjectAdd).toHaveBeenCalled();
    expect(mockSpacesManager.shareSavedObjectRemove).toHaveBeenCalled();
    expect(mockToastNotifications.addError).toHaveBeenCalled();
  });

  it('allows the form to be filled out to add a space', async () => {
    const {
      wrapper,
      onClose,
      mockSpacesManager,
      mockToastNotifications,
      savedObjectToShare,
    } = await setup();

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);

    // Using props callback instead of simulating clicks,
    // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
    const spaceSelector = wrapper.find(SelectableSpacesControl);

    act(() => {
      spaceSelector.props().onChange(['space-1', 'space-2', 'space-3']);
    });

    const startButton = findTestSubject(wrapper, 'sts-initiate-button');

    await act(async () => {
      startButton.simulate('click');
      await nextTick();
      wrapper.update();
    });

    const { type, id } = savedObjectToShare;
    const { shareSavedObjectAdd, shareSavedObjectRemove } = mockSpacesManager;
    expect(shareSavedObjectAdd).toHaveBeenCalledWith({ type, id }, ['space-2', 'space-3']);
    expect(shareSavedObjectRemove).not.toHaveBeenCalled();

    expect(mockToastNotifications.addSuccess).toHaveBeenCalledTimes(1);
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows the form to be filled out to remove a space', async () => {
    const {
      wrapper,
      onClose,
      mockSpacesManager,
      mockToastNotifications,
      savedObjectToShare,
    } = await setup();

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);

    // Using props callback instead of simulating clicks,
    // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
    const spaceSelector = wrapper.find(SelectableSpacesControl);

    act(() => {
      spaceSelector.props().onChange([]);
    });

    const startButton = findTestSubject(wrapper, 'sts-initiate-button');

    await act(async () => {
      startButton.simulate('click');
      await nextTick();
      wrapper.update();
    });

    const { type, id } = savedObjectToShare;
    const { shareSavedObjectAdd, shareSavedObjectRemove } = mockSpacesManager;
    expect(shareSavedObjectAdd).not.toHaveBeenCalled();
    expect(shareSavedObjectRemove).toHaveBeenCalledWith({ type, id }, ['space-1']);

    expect(mockToastNotifications.addSuccess).toHaveBeenCalledTimes(1);
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows the form to be filled out to add and remove a space', async () => {
    const {
      wrapper,
      onClose,
      mockSpacesManager,
      mockToastNotifications,
      savedObjectToShare,
    } = await setup();

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);

    // Using props callback instead of simulating clicks,
    // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
    const spaceSelector = wrapper.find(SelectableSpacesControl);

    act(() => {
      spaceSelector.props().onChange(['space-2', 'space-3']);
    });

    const startButton = findTestSubject(wrapper, 'sts-initiate-button');

    await act(async () => {
      startButton.simulate('click');
      await nextTick();
      wrapper.update();
    });

    const { type, id } = savedObjectToShare;
    const { shareSavedObjectAdd, shareSavedObjectRemove } = mockSpacesManager;
    expect(shareSavedObjectAdd).toHaveBeenCalledWith({ type, id }, ['space-2', 'space-3']);
    expect(shareSavedObjectRemove).toHaveBeenCalledWith({ type, id }, ['space-1']);

    expect(mockToastNotifications.addSuccess).toHaveBeenCalledTimes(2);
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
