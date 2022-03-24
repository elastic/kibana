/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import Boom from '@hapi/boom';
import { act } from '@testing-library/react';
import React from 'react';

import { findTestSubject, mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { coreMock } from 'src/core/public/mocks';

import type { Space } from '../../../common';
import { getSpacesContextProviderWrapper } from '../../spaces_context';
import { spacesManagerMock } from '../../spaces_manager/mocks';
import type { CopyToSpaceSavedObjectTarget } from '../types';
import { CopyModeControl } from './copy_mode_control';
import { getCopyToSpaceFlyoutComponent } from './copy_to_space_flyout';
import { CopyToSpaceForm } from './copy_to_space_form';
import { ProcessingCopyToSpace } from './processing_copy_to_space';
import { SelectableSpacesControl } from './selectable_spaces_control';

interface SetupOpts {
  mockSpaces?: Space[];
  returnBeforeSpacesLoad?: boolean;
}

const setup = async (opts: SetupOpts = {}) => {
  const onClose = jest.fn();

  const mockSpacesManager = spacesManagerMock.create();

  const getActiveSpace = Promise.resolve({
    id: 'my-active-space',
    name: 'my active space',
    disabledFeatures: [],
  });
  mockSpacesManager.getActiveSpace.mockReturnValue(getActiveSpace);

  const getSpaces = Promise.resolve(
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
  mockSpacesManager.getSpaces.mockReturnValue(getSpaces);

  const { getStartServices } = coreMock.createSetup();
  const startServices = coreMock.createStart();
  startServices.application.capabilities = {
    ...startServices.application.capabilities,
    spaces: { manage: true },
  };
  const mockToastNotifications = startServices.notifications.toasts;
  const getStartServicesPromise = Promise.resolve<any>([startServices, , ,]);
  getStartServices.mockReturnValue(getStartServicesPromise);

  const savedObjectToCopy = {
    type: 'dashboard',
    id: 'my-dash',
    namespaces: ['default'],
    icon: 'dashboard',
    title: 'foo',
  } as CopyToSpaceSavedObjectTarget;

  const SpacesContext = await getSpacesContextProviderWrapper({
    getStartServices,
    spacesManager: mockSpacesManager,
  });
  const CopyToSpaceFlyout = await getCopyToSpaceFlyoutComponent();

  const wrapper = mountWithIntl(
    <SpacesContext>
      <CopyToSpaceFlyout savedObjectTarget={savedObjectToCopy} onClose={onClose} />
    </SpacesContext>
  );

  // wait for context wrapper to rerender
  await act(async () => {
    await getStartServicesPromise;
    wrapper.update();
  });

  await getActiveSpace;
  await getSpaces;
  if (!opts.returnBeforeSpacesLoad) {
    // rerender after spaces manager API calls are completed
    wrapper.update();
  }

  return { wrapper, onClose, mockSpacesManager, mockToastNotifications, savedObjectToCopy };
};

describe('CopyToSpaceFlyout', () => {
  it('waits for spaces to load', async () => {
    const { wrapper } = await setup({ returnBeforeSpacesLoad: true });

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);

    wrapper.update();

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);
  });

  it('shows a message within an EuiEmptyPrompt when no spaces are available', async () => {
    const { wrapper, onClose } = await setup({ mockSpaces: [] });

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it('shows a message within an EuiEmptyPrompt when only the active space is available', async () => {
    const { wrapper, onClose } = await setup({
      mockSpaces: [{ id: 'my-active-space', name: '', disabledFeatures: [] }],
    });

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it('handles errors thrown from copySavedObjects API call', async () => {
    const { wrapper, mockSpacesManager, mockToastNotifications } = await setup();

    mockSpacesManager.copySavedObjects.mockImplementation(() => {
      return Promise.reject(Boom.serverUnavailable('Something bad happened'));
    });

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);

    // Using props callback instead of simulating clicks,
    // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
    const spaceSelector = wrapper.find(SelectableSpacesControl);
    act(() => {
      spaceSelector.props().onChange(['space-1']);
    });

    const startButton = findTestSubject(wrapper, 'cts-initiate-button');

    await act(async () => {
      startButton.simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(mockSpacesManager.copySavedObjects).toHaveBeenCalled();
    expect(mockToastNotifications.addError).toHaveBeenCalled();
  });

  it('handles errors thrown from resolveCopySavedObjectsErrors API call', async () => {
    const { wrapper, mockSpacesManager, mockToastNotifications } = await setup();

    mockSpacesManager.copySavedObjects.mockResolvedValue({
      'space-1': {
        success: true,
        successCount: 3,
        warnings: [],
      },
      'space-2': {
        success: false,
        successCount: 1,
        errors: [
          {
            type: 'index-pattern',
            id: 'conflicting-ip',
            error: { type: 'conflict' },
            meta: {},
          },
          {
            type: 'visualization',
            id: 'my-viz',
            error: { type: 'conflict' },
            meta: {},
          },
        ],
        warnings: [],
      },
    });

    mockSpacesManager.resolveCopySavedObjectsErrors.mockImplementation(() => {
      return Promise.reject(Boom.serverUnavailable('Something bad happened'));
    });

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);

    // Using props callback instead of simulating clicks,
    // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
    const spaceSelector = wrapper.find(SelectableSpacesControl);
    act(() => {
      spaceSelector.props().onChange(['space-2']);
    });

    const startButton = findTestSubject(wrapper, 'cts-initiate-button');

    await act(async () => {
      startButton.simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(mockSpacesManager.copySavedObjects).toHaveBeenCalled();
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();

    const spaceResult = findTestSubject(wrapper, `cts-space-result-space-2`);
    spaceResult.simulate('click');

    const overwriteSwitch = findTestSubject(
      wrapper,
      `cts-overwrite-conflict-index-pattern:conflicting-ip`
    );
    expect(overwriteSwitch.props()['aria-checked']).toEqual(false);
    overwriteSwitch.simulate('click');

    const finishButton = findTestSubject(wrapper, 'cts-finish-button');

    await act(async () => {
      finishButton.simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(mockSpacesManager.resolveCopySavedObjectsErrors).toHaveBeenCalled();
    expect(mockToastNotifications.addError).toHaveBeenCalled();
  });

  it('allows the form to be filled out', async () => {
    const { wrapper, onClose, mockSpacesManager, mockToastNotifications, savedObjectToCopy } =
      await setup();

    mockSpacesManager.copySavedObjects.mockResolvedValue({
      'space-1': {
        success: true,
        successCount: 3,
        warnings: [],
      },
      'space-2': {
        success: true,
        successCount: 3,
        warnings: [],
      },
    });

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);

    // Using props callback instead of simulating clicks,
    // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
    const spaceSelector = wrapper.find(SelectableSpacesControl);

    act(() => {
      spaceSelector.props().onChange(['space-1', 'space-2']);
    });

    const startButton = findTestSubject(wrapper, 'cts-initiate-button');

    await act(async () => {
      startButton.simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(mockSpacesManager.copySavedObjects).toHaveBeenCalledWith(
      [{ type: savedObjectToCopy.type, id: savedObjectToCopy.id }],
      ['space-1', 'space-2'],
      true,
      true, // `createNewCopies` is enabled by default
      true
    );

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(ProcessingCopyToSpace)).toHaveLength(1);

    const finishButton = findTestSubject(wrapper, 'cts-finish-button');
    act(() => {
      finishButton.simulate('click');
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();
  });

  it('allows conflicts to be resolved', async () => {
    const { wrapper, onClose, mockSpacesManager, mockToastNotifications, savedObjectToCopy } =
      await setup();

    mockSpacesManager.copySavedObjects.mockResolvedValue({
      'space-1': {
        success: true,
        successCount: 5,
        warnings: [],
      },
      'space-2': {
        success: false,
        successCount: 1,
        errors: [
          // regular conflict without destinationId
          {
            type: 'index-pattern',
            id: 'conflicting-ip',
            error: { type: 'conflict' },
            meta: {},
          },
          // regular conflict with destinationId
          {
            type: 'search',
            id: 'conflicting-search',
            error: { type: 'conflict', destinationId: 'another-search' },
            meta: {},
          },
          // ambiguous conflict
          {
            type: 'canvas-workpad',
            id: 'conflicting-canvas',
            error: {
              type: 'ambiguous_conflict',
              destinations: [
                { id: 'another-canvas', title: 'foo', updatedAt: undefined },
                { id: 'yet-another-canvas', title: 'bar', updatedAt: undefined },
              ],
            },
            meta: {},
          },
          // negative test case (skip)
          {
            type: 'visualization',
            id: 'my-viz',
            error: { type: 'conflict' },
            meta: {},
          },
        ],
        warnings: [],
      },
    });

    mockSpacesManager.resolveCopySavedObjectsErrors.mockResolvedValue({
      'space-2': {
        success: true,
        successCount: 2,
        warnings: [],
      },
    });

    // Using props callback instead of simulating clicks,
    // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
    const spaceSelector = wrapper.find(SelectableSpacesControl);

    act(() => {
      spaceSelector.props().onChange(['space-1', 'space-2']);
    });

    // Change copy mode to check for conflicts
    const copyModeControl = wrapper.find(CopyModeControl);
    copyModeControl.find('input[id="createNewCopiesDisabled"]').simulate('change');

    await act(async () => {
      const startButton = findTestSubject(wrapper, 'cts-initiate-button');
      startButton.simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(mockSpacesManager.copySavedObjects).toHaveBeenCalledWith(
      [{ type: savedObjectToCopy.type, id: savedObjectToCopy.id }],
      ['space-1', 'space-2'],
      true,
      false, // `createNewCopies` is disabled
      true
    );

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(ProcessingCopyToSpace)).toHaveLength(1);

    const spaceResult = findTestSubject(wrapper, `cts-space-result-space-2`);
    spaceResult.simulate('click');

    [
      'index-pattern:conflicting-ip',
      'search:conflicting-search',
      'canvas-workpad:conflicting-canvas',
    ].forEach((id) => {
      const overwriteSwitch = findTestSubject(wrapper, `cts-overwrite-conflict-${id}`);
      expect(overwriteSwitch.props()['aria-checked']).toEqual(false);
      overwriteSwitch.simulate('click');
    });

    const finishButton = findTestSubject(wrapper, 'cts-finish-button');

    await act(async () => {
      finishButton.simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(mockSpacesManager.resolveCopySavedObjectsErrors).toHaveBeenCalledWith(
      [{ type: savedObjectToCopy.type, id: savedObjectToCopy.id }],
      {
        'space-1': [],
        'space-2': [
          { type: 'index-pattern', id: 'conflicting-ip', overwrite: true },
          {
            type: 'search',
            id: 'conflicting-search',
            overwrite: true,
            destinationId: 'another-search',
          },
          {
            type: 'canvas-workpad',
            id: 'conflicting-canvas',
            overwrite: true,
            destinationId: 'another-canvas',
          },
        ],
      },
      true,
      false // `createNewCopies` is disabled
    );

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();
  });

  it('displays a warning when missing references are encountered', async () => {
    const { wrapper, onClose, mockSpacesManager, mockToastNotifications, savedObjectToCopy } =
      await setup();

    mockSpacesManager.copySavedObjects.mockResolvedValue({
      'space-1': {
        success: false,
        successCount: 1,
        errors: [
          // my-viz-1 just has a missing_references error
          {
            type: 'visualization',
            id: 'my-viz-1',
            error: {
              type: 'missing_references',
              references: [{ type: 'index-pattern', id: 'missing-index-pattern' }],
            },
            meta: {},
          },
          // my-viz-2 has both a missing_references error and a conflict error
          {
            type: 'visualization',
            id: 'my-viz-2',
            error: {
              type: 'missing_references',
              references: [{ type: 'index-pattern', id: 'missing-index-pattern' }],
            },
            meta: {},
          },
          {
            type: 'visualization',
            id: 'my-viz-2',
            error: { type: 'conflict' },
            meta: {},
          },
        ],
        successResults: [{ type: savedObjectToCopy.type, id: savedObjectToCopy.id, meta: {} }],
        warnings: [],
      },
    });

    // Using props callback instead of simulating clicks,
    // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
    const spaceSelector = wrapper.find(SelectableSpacesControl);

    act(() => {
      spaceSelector.props().onChange(['space-1']);
    });

    const startButton = findTestSubject(wrapper, 'cts-initiate-button');

    await act(async () => {
      startButton.simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(ProcessingCopyToSpace)).toHaveLength(1);

    const spaceResult = findTestSubject(wrapper, `cts-space-result-space-1`);
    spaceResult.simulate('click');

    const errorIconTip1 = spaceResult.find(
      'EuiIconTip[data-test-subj="cts-object-result-missing-references-my-viz-1"]'
    );
    expect(errorIconTip1.props()).toMatchInlineSnapshot(`
      Object {
        "color": "warning",
        "content": <FormattedMessage
          defaultMessage="Object will be copied, but one or more references are missing."
          id="xpack.spaces.management.copyToSpace.copyStatus.missingReferencesMessage"
          values={Object {}}
        />,
        "data-test-subj": "cts-object-result-missing-references-my-viz-1",
        "type": "link",
      }
    `);

    const myViz2Icon = 'EuiIconTip[data-test-subj="cts-object-result-missing-references-my-viz-2"]';
    expect(spaceResult.find(myViz2Icon)).toHaveLength(0);

    // TODO: test for a missing references icon by selecting overwrite for the my-viz-2 conflict

    const finishButton = findTestSubject(wrapper, 'cts-finish-button');
    await act(async () => {
      finishButton.simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(mockSpacesManager.resolveCopySavedObjectsErrors).toHaveBeenCalledWith(
      [{ type: savedObjectToCopy.type, id: savedObjectToCopy.id }],
      {
        'space-1': [
          { type: 'dashboard', id: 'my-dash', overwrite: false },
          {
            type: 'visualization',
            id: 'my-viz-1',
            overwrite: false,
            ignoreMissingReferences: true,
          },
        ],
      },
      true,
      true // `createNewCopies` is enabled by default
    );

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();
  });

  it('displays an error when an unresolvable error is encountered', async () => {
    const { wrapper, onClose, mockSpacesManager, mockToastNotifications } = await setup();

    mockSpacesManager.copySavedObjects.mockResolvedValue({
      'space-1': {
        success: true,
        successCount: 3,
        warnings: [],
      },
      'space-2': {
        success: false,
        successCount: 1,
        errors: [
          {
            type: 'visualization',
            id: 'my-viz',
            error: { type: 'unknown', message: 'some error message', statusCode: 400 },
            meta: {},
          },
        ],
        warnings: [],
      },
    });

    // Using props callback instead of simulating clicks,
    // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
    const spaceSelector = wrapper.find(SelectableSpacesControl);

    act(() => {
      spaceSelector.props().onChange(['space-1', 'space-2']);
    });

    const startButton = findTestSubject(wrapper, 'cts-initiate-button');

    await act(async () => {
      startButton.simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(ProcessingCopyToSpace)).toHaveLength(1);

    const spaceResult = findTestSubject(wrapper, `cts-space-result-space-2`);
    spaceResult.simulate('click');

    const errorIconTip = spaceResult.find(
      'EuiIconTip[data-test-subj="cts-object-result-error-my-viz"]'
    );

    expect(errorIconTip.props()).toMatchInlineSnapshot(`
      Object {
        "color": "danger",
        "content": <FormattedMessage
          defaultMessage="An error occurred copying this object."
          id="xpack.spaces.management.copyToSpace.copyStatus.unresolvableErrorMessage"
          values={Object {}}
        />,
        "data-test-subj": "cts-object-result-error-my-viz",
        "type": "alert",
      }
    `);

    const finishButton = findTestSubject(wrapper, 'cts-finish-button');
    act(() => {
      finishButton.simulate('click');
    });

    expect(mockSpacesManager.resolveCopySavedObjectsErrors).not.toHaveBeenCalled();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();
  });
});
