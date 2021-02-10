/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import Boom from '@hapi/boom';
import { mountWithIntl, nextTick, findTestSubject } from '@kbn/test/jest';
import { ShareToSpaceForm } from './share_to_space_form';
import {
  EuiCallOut,
  EuiCheckableCard,
  EuiCheckableCardProps,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiSelectable,
} from '@elastic/eui';
import { Space } from '../../../../../../src/plugins/spaces_oss/common';
import { SelectableSpacesControl } from './selectable_spaces_control';
import { act } from '@testing-library/react';
import { spacesManagerMock } from '../../spaces_manager/mocks';
import { coreMock } from '../../../../../../src/core/public/mocks';
import { CopySavedObjectsToSpaceFlyout } from '../../copy_saved_objects_to_space/components';
import { NoSpacesAvailable } from './no_spaces_available';
import { getShareToSpaceFlyoutComponent } from './share_to_space_flyout';
import { ShareModeControl } from './share_mode_control';
import { ReactWrapper } from 'enzyme';
import { ALL_SPACES_ID } from '../../../common/constants';
import { getSpacesContextWrapper } from '../../spaces_context';

interface SetupOpts {
  mockSpaces?: Space[];
  namespaces?: string[];
  returnBeforeSpacesLoad?: boolean;
  canShareToAllSpaces?: boolean; // default: true
  enableCreateCopyCallout?: boolean;
  enableCreateNewSpaceLink?: boolean;
  enableSpaceAgnosticBehavior?: boolean;
  mockFeatureId?: string; // optional feature ID to use for the SpacesContext
}

const setup = async (opts: SetupOpts = {}) => {
  const onClose = jest.fn();
  const onUpdate = jest.fn();

  const mockSpacesManager = spacesManagerMock.create();

  // note: this call is made in the SpacesContext
  mockSpacesManager.getActiveSpace.mockResolvedValue({
    id: 'my-active-space',
    name: 'my active space',
    disabledFeatures: [],
  });

  // note: this call is made in the SpacesContext
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

  mockSpacesManager.getShareSavedObjectPermissions.mockResolvedValue({
    shareToAllSpaces: opts.canShareToAllSpaces ?? true,
  });

  const savedObjectToShare = {
    type: 'dashboard',
    id: 'my-dash',
    namespaces: opts.namespaces || ['my-active-space', 'space-1'],
    icon: 'dashboard',
    title: 'foo',
  };

  const { getStartServices } = coreMock.createSetup();
  const startServices = coreMock.createStart();
  startServices.application.capabilities = {
    ...startServices.application.capabilities,
    spaces: { manage: true },
  };
  const mockToastNotifications = startServices.notifications.toasts;
  getStartServices.mockResolvedValue([startServices, , ,]);

  const SpacesContext = getSpacesContextWrapper({
    getStartServices,
    spacesManager: mockSpacesManager,
  });
  const ShareToSpaceFlyout = getShareToSpaceFlyoutComponent();
  // the internal flyout depends upon the Kibana React Context, and it cannot be used without the context wrapper
  // the context wrapper is only split into a separate component to avoid recreating the context upon every flyout state change
  // the ShareToSpaceFlyout component renders the internal flyout inside of the context wrapper
  const wrapper = mountWithIntl(
    <SpacesContext feature={opts.mockFeatureId}>
      <ShareToSpaceFlyout
        savedObjectTarget={savedObjectToShare}
        onUpdate={onUpdate}
        onClose={onClose}
        enableCreateCopyCallout={opts.enableCreateCopyCallout}
        enableCreateNewSpaceLink={opts.enableCreateNewSpaceLink}
        enableSpaceAgnosticBehavior={opts.enableSpaceAgnosticBehavior}
      />
    </SpacesContext>
  );

  // wait for context wrapper to rerender
  await act(async () => {
    await nextTick();
    wrapper.update();
  });

  if (!opts.returnBeforeSpacesLoad) {
    // Wait for spaces manager to complete and flyout to rerender
    wrapper.update();
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

    wrapper.update();

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(NoSpacesAvailable)).toHaveLength(0);
  });

  describe('without enableCreateCopyCallout', () => {
    it('does not show a warning callout when the saved object only has one namespace', async () => {
      const { wrapper, onClose } = await setup({
        namespaces: ['my-active-space'],
      });

      expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
      expect(wrapper.find(EuiCallOut)).toHaveLength(0);
      expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
      expect(onClose).toHaveBeenCalledTimes(0);
    });
  });

  describe('with enableCreateCopyCallout', () => {
    const enableCreateCopyCallout = true;

    it('does not show a warning callout when the saved object has multiple namespaces', async () => {
      const { wrapper, onClose } = await setup({ enableCreateCopyCallout });

      expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
      expect(wrapper.find(EuiCallOut)).toHaveLength(0);
      expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
      expect(onClose).toHaveBeenCalledTimes(0);
    });

    it('shows a warning callout when the saved object only has one namespace', async () => {
      const { wrapper, onClose } = await setup({
        enableCreateCopyCallout,
        namespaces: ['my-active-space'],
      });

      expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
      expect(wrapper.find(EuiCallOut)).toHaveLength(1);
      expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
      expect(onClose).toHaveBeenCalledTimes(0);
    });

    it('does not show the Copy flyout by default', async () => {
      const { wrapper, onClose } = await setup({
        enableCreateCopyCallout,
        namespaces: ['my-active-space'],
      });

      expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
      expect(wrapper.find(CopySavedObjectsToSpaceFlyout)).toHaveLength(0);
      expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
      expect(onClose).toHaveBeenCalledTimes(0);
    });

    it('shows the Copy flyout if the the "Make a copy" button is clicked', async () => {
      const { wrapper, onClose } = await setup({
        enableCreateCopyCallout,
        namespaces: ['my-active-space'],
      });

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
  });

  describe('without enableCreateNewSpaceLink', () => {
    it('does not render a NoSpacesAvailable component when no spaces are available', async () => {
      const { wrapper, onClose } = await setup({
        mockSpaces: [{ id: 'my-active-space', name: 'my active space', disabledFeatures: [] }],
      });

      expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
      expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
      expect(wrapper.find(NoSpacesAvailable)).toHaveLength(0);
      expect(onClose).toHaveBeenCalledTimes(0);
    });

    it('does not render a NoSpacesAvailable component when only the active space is available', async () => {
      const { wrapper, onClose } = await setup({
        mockSpaces: [{ id: 'my-active-space', name: '', disabledFeatures: [] }],
      });

      expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
      expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
      expect(wrapper.find(NoSpacesAvailable)).toHaveLength(0);
      expect(onClose).toHaveBeenCalledTimes(0);
    });
  });

  describe('with enableCreateNewSpaceLink', () => {
    const enableCreateNewSpaceLink = true;

    it('renders a NoSpacesAvailable component when no spaces are available', async () => {
      const { wrapper, onClose } = await setup({
        enableCreateNewSpaceLink,
        mockSpaces: [{ id: 'my-active-space', name: 'my active space', disabledFeatures: [] }],
      });

      expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
      expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
      expect(wrapper.find(NoSpacesAvailable)).toHaveLength(1);
      expect(onClose).toHaveBeenCalledTimes(0);
    });

    it('renders a NoSpacesAvailable component when only the active space is available', async () => {
      const { wrapper, onClose } = await setup({
        enableCreateNewSpaceLink,
        mockSpaces: [{ id: 'my-active-space', name: '', disabledFeatures: [] }],
      });

      expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
      expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
      expect(wrapper.find(NoSpacesAvailable)).toHaveLength(1);
      expect(onClose).toHaveBeenCalledTimes(0);
    });
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

  describe('correctly renders checkable cards', () => {
    function getCheckableCardProps(
      wrapper: ReactWrapper<React.PropsWithChildren<EuiCheckableCardProps>>
    ) {
      const iconTip = wrapper.find(EuiIconTip);
      return {
        checked: !!wrapper.prop('checked'),
        disabled: !!wrapper.prop('disabled'),
        ...(iconTip.length > 0 && { tooltip: iconTip.prop('content') as string }),
      };
    }
    function getCheckableCards<T>(wrapper: ReactWrapper<T, never>) {
      return {
        explicitSpacesCard: getCheckableCardProps(
          wrapper.find('#shareToExplicitSpaces').find(EuiCheckableCard)
        ),
        allSpacesCard: getCheckableCardProps(
          wrapper.find('#shareToAllSpaces').find(EuiCheckableCard)
        ),
      };
    }

    describe('when user has privileges to share to all spaces', () => {
      const canShareToAllSpaces = true;

      it('and the object is not shared to all spaces', async () => {
        const namespaces = ['my-active-space'];
        const { wrapper } = await setup({ canShareToAllSpaces, namespaces });
        const shareModeControl = wrapper.find(ShareModeControl);
        const checkableCards = getCheckableCards(shareModeControl);

        expect(checkableCards).toEqual({
          explicitSpacesCard: { checked: true, disabled: false },
          allSpacesCard: { checked: false, disabled: false },
        });
        expect(shareModeControl.find(EuiCallOut)).toHaveLength(0); // "Additional privileges required" callout
      });

      it('and the object is shared to all spaces', async () => {
        const namespaces = [ALL_SPACES_ID];
        const { wrapper } = await setup({ canShareToAllSpaces, namespaces });
        const shareModeControl = wrapper.find(ShareModeControl);
        const checkableCards = getCheckableCards(shareModeControl);

        expect(checkableCards).toEqual({
          explicitSpacesCard: { checked: false, disabled: false },
          allSpacesCard: { checked: true, disabled: false },
        });
        expect(shareModeControl.find(EuiCallOut)).toHaveLength(0); // "Additional privileges required" callout
      });
    });

    describe('when user does not have privileges to share to all spaces', () => {
      const canShareToAllSpaces = false;

      it('and the object is not shared to all spaces', async () => {
        const namespaces = ['my-active-space'];
        const { wrapper } = await setup({ canShareToAllSpaces, namespaces });
        const shareModeControl = wrapper.find(ShareModeControl);
        const checkableCards = getCheckableCards(shareModeControl);

        expect(checkableCards).toEqual({
          explicitSpacesCard: { checked: true, disabled: false },
          allSpacesCard: {
            checked: false,
            disabled: true,
            tooltip: 'You need additional privileges to use this option.',
          },
        });
        expect(shareModeControl.find(EuiCallOut)).toHaveLength(0); // "Additional privileges required" callout
      });

      it('and the object is shared to all spaces', async () => {
        const namespaces = [ALL_SPACES_ID];
        const { wrapper } = await setup({ canShareToAllSpaces, namespaces });
        const shareModeControl = wrapper.find(ShareModeControl);
        const checkableCards = getCheckableCards(shareModeControl);

        expect(checkableCards).toEqual({
          explicitSpacesCard: { checked: false, disabled: true },
          allSpacesCard: {
            checked: true,
            disabled: true,
            tooltip: 'You need additional privileges to change this option.',
          },
        });
        expect(shareModeControl.find(EuiCallOut)).toHaveLength(1); // "Additional privileges required" callout
      });
    });
  });

  describe('space selection', () => {
    const mockFeatureId = 'some-feature';

    const mockSpaces = [
      {
        // normal "fully authorized" space selection option -- not the active space
        id: 'space-1',
        name: 'Space 1',
        disabledFeatures: [],
      },
      {
        // normal "fully authorized" space selection option, with a disabled feature -- not the active space
        id: 'space-2',
        name: 'Space 2',
        disabledFeatures: [mockFeatureId],
      },
      {
        // "partially authorized" space selection option -- not the active space
        id: 'space-3',
        name: 'Space 3',
        disabledFeatures: [],
        authorizedPurposes: { shareSavedObjectsIntoSpace: false },
      },
      {
        // "partially authorized" space selection option, with a disabled feature -- not the active space
        id: 'space-4',
        name: 'Space 4',
        disabledFeatures: [mockFeatureId],
        authorizedPurposes: { shareSavedObjectsIntoSpace: false },
      },
      {
        // "active space" selection option (determined by an ID that matches the result of `getActiveSpace`, mocked at top)
        id: 'my-active-space',
        name: 'my active space',
        disabledFeatures: [],
      },
    ];

    const expectActiveSpace = (option: any, { spaceId }: { spaceId: string }) => {
      expect(option['data-space-id']).toEqual(spaceId);
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
    const expectNeedAdditionalPrivileges = (
      option: any,
      {
        spaceId,
        checked,
        featureIsDisabled,
      }: { spaceId: string; checked: boolean; featureIsDisabled?: boolean }
    ) => {
      expect(option['data-space-id']).toEqual(spaceId);
      if (checked && featureIsDisabled) {
        expect(option.append).toMatchInlineSnapshot(`
          <React.Fragment>
            <EuiIconTip
              content="You need additional privileges to deselect this space."
              position="left"
              type="iInCircle"
            />
            <EuiIconTip
              color="warning"
              content="This feature is disabled in this space, it will have no effect unless the feature is enabled again."
              position="left"
              type="alert"
            />
          </React.Fragment>
        `);
      } else if (checked && !featureIsDisabled) {
        expect(option.append).toMatchInlineSnapshot(`
          <React.Fragment>
            <EuiIconTip
              content="You need additional privileges to deselect this space."
              position="left"
              type="iInCircle"
            />
          </React.Fragment>
        `);
      } else if (!checked && !featureIsDisabled) {
        expect(option.append).toMatchInlineSnapshot(`
          <React.Fragment>
            <EuiIconTip
              content="You need additional privileges to select this space."
              position="left"
              type="iInCircle"
            />
          </React.Fragment>
        `);
      } else {
        throw new Error('Unexpected test case!');
      }
      expect(option.checked).toEqual(checked ? 'on' : undefined);
      expect(option.disabled).toEqual(true);
    };
    const expectFeatureIsDisabled = (option: any, { spaceId }: { spaceId: string }) => {
      expect(option['data-space-id']).toEqual(spaceId);
      expect(option.append).toMatchInlineSnapshot(`
        <EuiIconTip
          color="warning"
          content="This feature is disabled in this space, it will have no effect unless the feature is enabled again."
          position="left"
          type="alert"
        />
      `);
      expect(option.checked).toEqual('on');
      expect(option.disabled).toBeUndefined();
    };
    const expectInactiveSpace = (
      option: any,
      { spaceId, checked }: { spaceId: string; checked: boolean }
    ) => {
      expect(option['data-space-id']).toEqual(spaceId);
      expect(option.append).toBeUndefined();
      expect(option.checked).toEqual(checked ? 'on' : undefined);
      expect(option.disabled).toBeUndefined();
    };

    describe('without enableSpaceAgnosticBehavior', () => {
      it('correctly defines space selection options', async () => {
        const namespaces = ['my-active-space', 'space-1', 'space-3']; // the saved object's current namespaces
        const { wrapper } = await setup({ mockSpaces, namespaces });

        const selectable = wrapper.find(SelectableSpacesControl).find(EuiSelectable);
        const options = selectable.prop('options');
        expect(options).toHaveLength(5);
        expectActiveSpace(options[0], { spaceId: 'my-active-space' });
        expectInactiveSpace(options[1], { spaceId: 'space-1', checked: true });
        expectInactiveSpace(options[2], { spaceId: 'space-2', checked: false });
        expectNeedAdditionalPrivileges(options[3], { spaceId: 'space-3', checked: true });
        expectNeedAdditionalPrivileges(options[4], { spaceId: 'space-4', checked: false });
      });

      describe('with a SpacesContext for a specific feature', () => {
        it('correctly defines space selection options when affected spaces are not selected', async () => {
          const namespaces = ['my-active-space']; // the saved object's current namespaces
          const { wrapper } = await setup({ mockSpaces, namespaces, mockFeatureId });

          const selectable = wrapper.find(SelectableSpacesControl).find(EuiSelectable);
          const options = selectable.prop('options');
          expect(options).toHaveLength(3);
          expectActiveSpace(options[0], { spaceId: 'my-active-space' });
          expectInactiveSpace(options[1], { spaceId: 'space-1', checked: false });
          expectNeedAdditionalPrivileges(options[2], { spaceId: 'space-3', checked: false });
          // space-2 and space-4 are omitted, because they are not selected and the current feature is disabled in those spaces
        });

        it('correctly defines space selection options when affected spaces are already selected', async () => {
          const namespaces = ['my-active-space', 'space-1', 'space-2', 'space-3', 'space-4']; // the saved object's current namespaces
          const { wrapper } = await setup({ mockSpaces, namespaces, mockFeatureId });

          const selectable = wrapper.find(SelectableSpacesControl).find(EuiSelectable);
          const options = selectable.prop('options');
          expect(options).toHaveLength(5);
          expectActiveSpace(options[0], { spaceId: 'my-active-space' });
          expectInactiveSpace(options[1], { spaceId: 'space-1', checked: true });
          expectNeedAdditionalPrivileges(options[2], { spaceId: 'space-3', checked: true });
          // space-2 and space-4 are at the end, because they are selected and the current feature is disabled in those spaces
          expectFeatureIsDisabled(options[3], { spaceId: 'space-2' });
          expectNeedAdditionalPrivileges(options[4], {
            spaceId: 'space-4',
            checked: true,
            featureIsDisabled: true,
          });
        });
      });
    });

    describe('with enableSpaceAgnosticBehavior', () => {
      const enableSpaceAgnosticBehavior = true;

      it('correctly defines space selection options', async () => {
        const namespaces = ['my-active-space', 'space-1', 'space-3']; // the saved object's current namespaces
        const { wrapper } = await setup({ enableSpaceAgnosticBehavior, mockSpaces, namespaces });

        const selectable = wrapper.find(SelectableSpacesControl).find(EuiSelectable);
        const options = selectable.prop('options');
        expect(options).toHaveLength(5);
        expectInactiveSpace(options[0], { spaceId: 'space-1', checked: true });
        expectInactiveSpace(options[1], { spaceId: 'space-2', checked: false });
        expectNeedAdditionalPrivileges(options[2], { spaceId: 'space-3', checked: true });
        expectNeedAdditionalPrivileges(options[3], { spaceId: 'space-4', checked: false });
        expectInactiveSpace(options[4], { spaceId: 'my-active-space', checked: true });
      });
    });
  });
});
