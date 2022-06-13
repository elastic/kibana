/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiIconTip, EuiLoadingSpinner, EuiSelectable } from '@elastic/eui';
import Boom from '@hapi/boom';
import { act } from '@testing-library/react';
import type { ReactWrapper } from 'enzyme';
import React from 'react';

import { findTestSubject, mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import type { SavedObjectReferenceWithContext } from 'src/core/public';
import { coreMock } from 'src/core/public/mocks';

import type { Space } from '../../../common';
import { ALL_SPACES_ID } from '../../../common/constants';
import { CopyToSpaceFlyoutInternal } from '../../copy_saved_objects_to_space/components/copy_to_space_flyout_internal';
import { getSpacesContextProviderWrapper } from '../../spaces_context';
import { spacesManagerMock } from '../../spaces_manager/mocks';
import { AliasTable } from './alias_table';
import { NoSpacesAvailable } from './no_spaces_available';
import { RelativesFooter } from './relatives_footer';
import { SelectableSpacesControl } from './selectable_spaces_control';
import { ShareModeControl } from './share_mode_control';
import { getShareToSpaceFlyoutComponent } from './share_to_space_flyout';
import { ShareToSpaceForm } from './share_to_space_form';

interface SetupOpts {
  mockSpaces?: Space[];
  namespaces?: string[];
  returnBeforeSpacesLoad?: boolean;
  canShareToAllSpaces?: boolean; // default: true
  enableCreateCopyCallout?: boolean;
  enableCreateNewSpaceLink?: boolean;
  behaviorContext?: 'within-space' | 'outside-space';
  mockFeatureId?: string; // optional feature ID to use for the SpacesContext
  additionalShareableReferences?: SavedObjectReferenceWithContext[];
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

  mockSpacesManager.getShareableReferences.mockResolvedValue({
    objects: [
      {
        // this is the result for the saved object target; by default, it has no references
        type: savedObjectToShare.type,
        id: savedObjectToShare.id,
        spaces: savedObjectToShare.namespaces,
        inboundReferences: [],
      },
      ...(opts.additionalShareableReferences ?? []),
    ],
  });

  const { getStartServices } = coreMock.createSetup();
  const startServices = coreMock.createStart();
  startServices.application.capabilities = {
    ...startServices.application.capabilities,
    spaces: { manage: true },
  };
  const mockToastNotifications = startServices.notifications.toasts;
  getStartServices.mockResolvedValue([startServices, , ,]);

  const SpacesContext = await getSpacesContextProviderWrapper({
    getStartServices,
    spacesManager: mockSpacesManager,
  });
  const ShareToSpaceFlyout = await getShareToSpaceFlyoutComponent();
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
        behaviorContext={opts.behaviorContext}
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

function changeSpaceSelection(wrapper: ReactWrapper, selectedSpaces: string[]) {
  // Using props callback instead of simulating clicks, because EuiSelectable uses a virtualized list, which isn't easily testable via test
  // subjects
  const spaceSelector = wrapper.find(SelectableSpacesControl);
  act(() => {
    spaceSelector.props().onChange(selectedSpaces);
  });
  wrapper.update();
}

async function clickButton(wrapper: ReactWrapper, button: 'continue' | 'save' | 'copy') {
  const buttonNode = findTestSubject(wrapper, `sts-${button}-button`);
  await act(async () => {
    buttonNode.simulate('click');
    await nextTick();
    wrapper.update();
  });
}

describe('ShareToSpaceFlyout', () => {
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
      expect(wrapper.find(CopyToSpaceFlyoutInternal)).toHaveLength(0);
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

      await clickButton(wrapper, 'copy'); // this link is only present in the warning callout
      wrapper.update();

      expect(wrapper.find(CopyToSpaceFlyoutInternal)).toHaveLength(1);
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

    mockSpacesManager.updateSavedObjectsSpaces.mockRejectedValue(
      Boom.serverUnavailable('Something bad happened')
    );

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(NoSpacesAvailable)).toHaveLength(0);

    changeSpaceSelection(wrapper, ['space-2', 'space-3']);
    await clickButton(wrapper, 'save');

    expect(mockSpacesManager.updateSavedObjectsSpaces).toHaveBeenCalled();
    expect(mockToastNotifications.addError).toHaveBeenCalled();
  });

  it('allows the form to be filled out to add a space', async () => {
    const { wrapper, onClose, mockSpacesManager, mockToastNotifications, savedObjectToShare } =
      await setup();

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(NoSpacesAvailable)).toHaveLength(0);

    changeSpaceSelection(wrapper, ['space-1', 'space-2', 'space-3']);
    await clickButton(wrapper, 'save');

    const { type, id } = savedObjectToShare;
    expect(mockSpacesManager.updateSavedObjectsSpaces).toHaveBeenCalledWith(
      [{ type, id }],
      ['space-2', 'space-3'],
      []
    );

    expect(mockToastNotifications.addSuccess).toHaveBeenCalledTimes(1);
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows the form to be filled out to remove a space', async () => {
    const { wrapper, onClose, mockSpacesManager, mockToastNotifications, savedObjectToShare } =
      await setup();

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(NoSpacesAvailable)).toHaveLength(0);

    changeSpaceSelection(wrapper, []);
    await clickButton(wrapper, 'save');

    const { type, id } = savedObjectToShare;
    expect(mockSpacesManager.updateSavedObjectsSpaces).toHaveBeenCalledWith(
      [{ type, id }],
      [],
      ['space-1']
    );

    expect(mockToastNotifications.addSuccess).toHaveBeenCalledTimes(1);
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows the form to be filled out to add and remove a space', async () => {
    const { wrapper, onClose, mockSpacesManager, mockToastNotifications, savedObjectToShare } =
      await setup();

    expect(wrapper.find(ShareToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(NoSpacesAvailable)).toHaveLength(0);

    changeSpaceSelection(wrapper, ['space-2', 'space-3']);
    await clickButton(wrapper, 'save');

    const { type, id } = savedObjectToShare;
    expect(mockSpacesManager.updateSavedObjectsSpaces).toHaveBeenCalledWith(
      [{ type, id }],
      ['space-2', 'space-3'],
      ['space-1']
    );

    expect(mockToastNotifications.addSuccess).toHaveBeenCalledTimes(1);
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('correctly renders share mode control', () => {
    function getDescriptionAndWarning(wrapper: ReactWrapper) {
      const descriptionNode = findTestSubject(wrapper, 'share-mode-control-description');
      const iconTipNode = wrapper.find(ShareModeControl).find(EuiIconTip);
      return {
        description: descriptionNode.text(),
        isPrivilegeTooltipDisplayed: iconTipNode.length > 0,
      };
    }

    describe('when user has privileges to share to all spaces', () => {
      const canShareToAllSpaces = true;

      it('and the object is not shared to all spaces', async () => {
        const namespaces = ['my-active-space'];
        const { wrapper } = await setup({ canShareToAllSpaces, namespaces });
        const { description, isPrivilegeTooltipDisplayed } = getDescriptionAndWarning(wrapper);

        expect(description).toMatchInlineSnapshot(
          `"Make object available in selected spaces only."`
        );
        expect(isPrivilegeTooltipDisplayed).toBe(false);
      });

      it('and the object is shared to all spaces', async () => {
        const namespaces = [ALL_SPACES_ID];
        const { wrapper } = await setup({ canShareToAllSpaces, namespaces });
        const { description, isPrivilegeTooltipDisplayed } = getDescriptionAndWarning(wrapper);

        expect(description).toMatchInlineSnapshot(
          `"Make object available in all current and future spaces."`
        );
        expect(isPrivilegeTooltipDisplayed).toBe(false);
      });
    });

    describe('when user does not have privileges to share to all spaces', () => {
      const canShareToAllSpaces = false;

      it('and the object is not shared to all spaces', async () => {
        const namespaces = ['my-active-space'];
        const { wrapper } = await setup({ canShareToAllSpaces, namespaces });
        const { description, isPrivilegeTooltipDisplayed } = getDescriptionAndWarning(wrapper);

        expect(description).toMatchInlineSnapshot(
          `"Make object available in selected spaces only."`
        );
        expect(isPrivilegeTooltipDisplayed).toBe(true);
      });

      it('and the object is shared to all spaces', async () => {
        const namespaces = [ALL_SPACES_ID];
        const { wrapper } = await setup({ canShareToAllSpaces, namespaces });
        const { description, isPrivilegeTooltipDisplayed } = getDescriptionAndWarning(wrapper);

        expect(description).toMatchInlineSnapshot(
          `"Make object available in all current and future spaces."`
        );
        expect(isPrivilegeTooltipDisplayed).toBe(true);
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
          This space
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
              content="This feature is disabled in this space."
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
          content="This feature is disabled in this space."
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

    describe('with behaviorContext="within-space" (default)', () => {
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

    describe('with behaviorContext="outside-space"', () => {
      const behaviorContext = 'outside-space';

      it('correctly defines space selection options', async () => {
        const namespaces = ['my-active-space', 'space-1', 'space-3']; // the saved object's current namespaces
        const { wrapper } = await setup({ behaviorContext, mockSpaces, namespaces });

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

  describe('alias list', () => {
    it('shows only aliases for spaces that exist', async () => {
      const namespaces = ['my-active-space']; // the saved object's current namespaces
      const { wrapper } = await setup({
        namespaces,
        additionalShareableReferences: [
          // it doesn't matter if aliases are for the saved object target or for references; this is easier to mock
          {
            type: 'foo',
            id: '1',
            spaces: namespaces,
            inboundReferences: [],
            spacesWithMatchingAliases: ['space-1', 'some-space-that-does-not-exist'], // space-1 exists, it is mocked at the top
          },
        ],
      });

      changeSpaceSelection(wrapper, ['*']);
      await clickButton(wrapper, 'continue');

      const aliasTable = wrapper.find(AliasTable);
      expect(aliasTable.prop('aliasesToDisable')).toEqual([
        { targetType: 'foo', sourceId: '1', targetSpace: 'space-1', spaceExists: true },
        {
          // this alias is present, and it will be disabled, but it is not displayed in the table below due to the 'spaceExists' field
          targetType: 'foo',
          sourceId: '1',
          targetSpace: 'some-space-that-does-not-exist',
          spaceExists: false,
        },
      ]);
      expect(aliasTable.find(EuiCallOut).text()).toMatchInlineSnapshot(
        `"Legacy URL conflict1 legacy URL will be disabled."`
      );
    });

    it('shows only aliases for selected spaces', async () => {
      const namespaces = ['my-active-space']; // the saved object's current namespaces
      const { wrapper } = await setup({
        namespaces,
        additionalShareableReferences: [
          // it doesn't matter if aliases are for the saved object target or for references; this is easier to mock
          {
            type: 'foo',
            id: '1',
            spaces: namespaces,
            inboundReferences: [],
            spacesWithMatchingAliases: ['space-1', 'space-2'], // space-1 and space-2 both exist, they are mocked at the top
          },
        ],
      });

      changeSpaceSelection(wrapper, ['space-1']);
      await clickButton(wrapper, 'continue');

      const aliasTable = wrapper.find(AliasTable);
      expect(aliasTable.prop('aliasesToDisable')).toEqual([
        { targetType: 'foo', sourceId: '1', targetSpace: 'space-1', spaceExists: true },
        // even though an alias exists for space-2, it will not be disabled, because we aren't sharing to that space
      ]);
      expect(aliasTable.find(EuiCallOut).text()).toMatchInlineSnapshot(
        `"Legacy URL conflict1 legacy URL will be disabled."`
      );
    });
  });

  describe('footer', () => {
    it('does not show a description of relatives (references) if there are none', async () => {
      const namespaces = ['my-active-space']; // the saved object's current namespaces
      const { wrapper } = await setup({ namespaces });

      const relativesControl = wrapper.find(RelativesFooter);
      expect(relativesControl.isEmptyRender()).toBe(true);
    });

    it('shows a description of filtered relatives (references)', async () => {
      const namespaces = ['my-active-space']; // the saved object's current namespaces
      const { wrapper } = await setup({
        namespaces,
        additionalShareableReferences: [
          // the saved object target is already included in the mock results by default; it will not be counted
          { type: 'foo', id: '1', spaces: [], inboundReferences: [] }, // this will not be counted because spaces is empty (it may not be a shareable type)
          { type: 'foo', id: '2', spaces: namespaces, inboundReferences: [], isMissing: true }, // this will not be counted because isMissing === true
          { type: 'foo', id: '3', spaces: namespaces, inboundReferences: [] }, // this will be counted
        ],
      });

      const relativesControl = wrapper.find(RelativesFooter);
      expect(relativesControl.isEmptyRender()).toBe(false);
      expect(relativesControl.text()).toMatchInlineSnapshot(`"1 related object will also change."`);
    });

    function expectButton(wrapper: ReactWrapper, button: 'save' | 'continue') {
      const saveButton = findTestSubject(wrapper, 'sts-save-button');
      const continueButton = findTestSubject(wrapper, 'sts-continue-button');
      expect(saveButton).toHaveLength(button === 'save' ? 1 : 0);
      expect(continueButton).toHaveLength(button === 'continue' ? 1 : 0);
    }

    it('shows a save button if there are no legacy URL aliases to disable', async () => {
      const namespaces = ['my-active-space']; // the saved object's current namespaces
      const { wrapper } = await setup({ namespaces });

      changeSpaceSelection(wrapper, ['*']);
      expectButton(wrapper, 'save');
    });

    it('shows a save button if there are legacy URL aliases to disable, but none for existing spaces', async () => {
      const namespaces = ['my-active-space']; // the saved object's current namespaces
      const { wrapper } = await setup({
        namespaces,
        additionalShareableReferences: [
          // it doesn't matter if aliases are for the saved object target or for references; this is easier to mock
          {
            type: 'foo',
            id: '1',
            spaces: namespaces,
            inboundReferences: [],
            spacesWithMatchingAliases: ['some-space-that-does-not-exist'],
          },
        ],
      });

      changeSpaceSelection(wrapper, ['*']);
      expectButton(wrapper, 'save');
    });

    it('shows a continue button if there are legacy URL aliases to disable for existing spaces', async () => {
      const namespaces = ['my-active-space']; // the saved object's current namespaces
      const { wrapper } = await setup({
        namespaces,
        additionalShareableReferences: [
          // it doesn't matter if aliases are for the saved object target or for references; this is easier to mock
          {
            type: 'foo',
            id: '1',
            spaces: namespaces,
            inboundReferences: [],
            spacesWithMatchingAliases: ['space-1', 'some-space-that-does-not-exist'], // space-1 exists, it is mocked at the top
          },
        ],
      });

      changeSpaceSelection(wrapper, ['*']);
      expectButton(wrapper, 'continue');
    });
  });
});
