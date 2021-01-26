/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import Boom from '@hapi/boom';
import { mountWithIntl, nextTick } from '@kbn/test/jest';
import { ShareSavedObjectsToSpaceFlyout } from './share_to_space_flyout';
import { ShareToSpaceForm } from './share_to_space_form';
import { EuiLoadingSpinner, EuiSelectable } from '@elastic/eui';
import { Space } from '../../../../../../src/plugins/spaces_oss/common';
import { findTestSubject } from '@kbn/test/jest';
import { SelectableSpacesControl } from './selectable_spaces_control';
import { act } from '@testing-library/react';
import { spacesManagerMock } from '../../spaces_manager/mocks';
import { SpacesManager } from '../../spaces_manager';
import { coreMock } from '../../../../../../src/core/public/mocks';
import { ToastsApi } from 'src/core/public';
import { EuiCallOut } from '@elastic/eui';
import { CopySavedObjectsToSpaceFlyout } from '../../copy_saved_objects_to_space/components';
import { NoSpacesAvailable } from './no_spaces_available';
import { SavedObjectsManagementRecord } from 'src/plugins/saved_objects_management/public';
import { ContextWrapper } from '.';

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

  mockSpacesManager.getShareSavedObjectPermissions.mockResolvedValue({ shareToAllSpaces: true });

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

  const { getStartServices } = coreMock.createSetup();
  const startServices = coreMock.createStart();
  startServices.application.capabilities = {
    ...startServices.application.capabilities,
    spaces: { manage: true },
  };
  getStartServices.mockResolvedValue([startServices, , ,]);

  // the flyout depends upon the Kibana React Context, and it cannot be used without the context wrapper
  // the context wrapper is only split into a separate component to avoid recreating the context upon every flyout state change
  const wrapper = mountWithIntl(
    <ContextWrapper getStartServices={getStartServices}>
      <ShareSavedObjectsToSpaceFlyout
        savedObject={savedObjectToShare}
        spacesManager={(mockSpacesManager as unknown) as SpacesManager}
        toastNotifications={(mockToastNotifications as unknown) as ToastsApi}
        onClose={onClose}
        onObjectUpdated={onObjectUpdated}
      />
    </ContextWrapper>
  );

  // wait for context wrapper to rerender
  await act(async () => {
    await nextTick();
    wrapper.update();
  });

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
    expect(wrapper.find(NoSpacesAvailable)).toHaveLength(0);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(NoSpacesAvailable)).toHaveLength(0);
  });

  it('shows a message within a NoSpacesAvailable when no spaces are available', async () => {
    const { wrapper, onClose } = await setup({
      mockSpaces: [{ id: 'my-active-space', name: 'my active space', disabledFeatures: [] }],
    });

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(NoSpacesAvailable)).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it('shows a message within a NoSpacesAvailable when only the active space is available', async () => {
    const { wrapper, onClose } = await setup({
      mockSpaces: [{ id: 'my-active-space', name: '', disabledFeatures: [] }],
    });

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(NoSpacesAvailable)).toHaveLength(1);
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
    expect(wrapper.find(NoSpacesAvailable)).toHaveLength(0);

    const copyButton = findTestSubject(wrapper, 'sts-copy-link'); // this link is only present in the warning callout

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
    expect(wrapper.find(NoSpacesAvailable)).toHaveLength(0);

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
    expect(wrapper.find(NoSpacesAvailable)).toHaveLength(0);

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
    expect(wrapper.find(NoSpacesAvailable)).toHaveLength(0);

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
    expect(wrapper.find(NoSpacesAvailable)).toHaveLength(0);

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
    expect(wrapper.find(NoSpacesAvailable)).toHaveLength(0);

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

  describe('space selection', () => {
    const mockSpaces = [
      {
        // normal "fully authorized" space selection option -- not the active space
        id: 'space-1',
        name: 'Space 1',
        disabledFeatures: [],
      },
      {
        // "partially authorized" space selection option -- not the active space
        id: 'space-2',
        name: 'Space 2',
        disabledFeatures: [],
        authorizedPurposes: { shareSavedObjectsIntoSpace: false },
      },
      {
        // "active space" selection option (determined by an ID that matches the result of `getActiveSpace`, mocked at top)
        id: 'my-active-space',
        name: 'my active space',
        disabledFeatures: [],
      },
    ];

    const expectActiveSpace = (option: any) => {
      expect(option.append).toMatchInlineSnapshot(`
        <EuiBadge
          color="hollow"
        >
          Current
        </EuiBadge>
      `);
      // by definition, the active space will always be checked
      expect(option.checked).toEqual('on');
      expect(option.disabled).toEqual(true);
    };
    const expectInactiveSpace = (option: any, checked: boolean) => {
      expect(option.append).toBeUndefined();
      expect(option.checked).toEqual(checked ? 'on' : undefined);
      expect(option.disabled).toBeUndefined();
    };
    const expectPartiallyAuthorizedSpace = (option: any, checked: boolean) => {
      if (checked) {
        expect(option.append).toMatchInlineSnapshot(`
          <EuiIconTip
            content="You need additional privileges to deselect this space."
            position="left"
            type="iInCircle"
          />
        `);
      } else {
        expect(option.append).toMatchInlineSnapshot(`
          <EuiIconTip
            content="You need additional privileges to select this space."
            position="left"
            type="iInCircle"
          />
        `);
      }
      expect(option.checked).toEqual(checked ? 'on' : undefined);
      expect(option.disabled).toEqual(true);
    };

    it('correctly defines space selection options when spaces are not selected', async () => {
      const namespaces = ['my-active-space']; // the saved object's current namespaces; it will always exist in at least the active namespace
      const { wrapper } = await setup({ mockSpaces, namespaces });

      const selectable = wrapper.find(SelectableSpacesControl).find(EuiSelectable);
      const selectOptions = selectable.prop('options');
      expect(selectOptions[0]['data-space-id']).toEqual('my-active-space');
      expectActiveSpace(selectOptions[0]);
      expect(selectOptions[1]['data-space-id']).toEqual('space-1');
      expectInactiveSpace(selectOptions[1], false);
      expect(selectOptions[2]['data-space-id']).toEqual('space-2');
      expectPartiallyAuthorizedSpace(selectOptions[2], false);
    });

    it('correctly defines space selection options when spaces are selected', async () => {
      const namespaces = ['my-active-space', 'space-1', 'space-2']; // the saved object's current namespaces
      const { wrapper } = await setup({ mockSpaces, namespaces });

      const selectable = wrapper.find(SelectableSpacesControl).find(EuiSelectable);
      const selectOptions = selectable.prop('options');
      expect(selectOptions[0]['data-space-id']).toEqual('my-active-space');
      expectActiveSpace(selectOptions[0]);
      expect(selectOptions[1]['data-space-id']).toEqual('space-1');
      expectInactiveSpace(selectOptions[1], true);
      expect(selectOptions[2]['data-space-id']).toEqual('space-2');
      expectPartiallyAuthorizedSpace(selectOptions[2], true);
    });
  });
});
