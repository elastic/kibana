/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
<<<<<<< HEAD
import { mount, shallow } from 'enzyme';
import React from 'react';
=======
import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import { SpacesManager } from '../../../lib';
import { SpacesNavState } from '../../nav_control';
import { ConfirmDeleteModal } from './confirm_delete_modal';

const buildMockChrome = () => {
  return {
    addBasePath: (path: string) => path,
  };
};

describe('ConfirmDeleteModal', () => {
  it('renders as expected', () => {
    const space = {
      id: 'my-space',
      name: 'My Space',
    };

    const mockHttp = {
      delete: jest.fn(() => Promise.resolve()),
    };
    const mockChrome = buildMockChrome();

    const spacesManager = new SpacesManager(mockHttp, mockChrome, '/');

    const spacesNavState: SpacesNavState = {
      getActiveSpace: () => space,
      refreshSpacesList: jest.fn(),
    };

    const onCancel = jest.fn();
    const onConfirm = jest.fn();

    expect(
<<<<<<< HEAD
      shallow(
        <ConfirmDeleteModal
=======
      shallowWithIntl(
        <ConfirmDeleteModal.WrappedComponent
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
          space={space}
          spacesManager={spacesManager}
          spacesNavState={spacesNavState}
          onCancel={onCancel}
          onConfirm={onConfirm}
<<<<<<< HEAD
=======
          intl={null as any}
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        />
      )
    ).toMatchSnapshot();
  });

  it(`requires the space name to be typed before confirming`, () => {
    const space = {
      id: 'my-space',
      name: 'My Space',
    };

    const mockHttp = {
      delete: jest.fn(() => Promise.resolve()),
    };
    const mockChrome = buildMockChrome();

    const spacesManager = new SpacesManager(mockHttp, mockChrome, '/');

    const spacesNavState: SpacesNavState = {
      getActiveSpace: () => space,
      refreshSpacesList: jest.fn(),
    };

    const onCancel = jest.fn();
    const onConfirm = jest.fn();

<<<<<<< HEAD
    const wrapper = mount(
      <ConfirmDeleteModal
=======
    const wrapper = mountWithIntl(
      <ConfirmDeleteModal.WrappedComponent
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        space={space}
        spacesManager={spacesManager}
        spacesNavState={spacesNavState}
        onCancel={onCancel}
        onConfirm={onConfirm}
<<<<<<< HEAD
=======
        intl={null as any}
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
      />
    );

    const input = wrapper.find('input');
    expect(input).toHaveLength(1);

    input.simulate('change', { target: { value: 'My Invalid Space Name ' } });

    const confirmButton = wrapper.find('button[data-test-subj="confirmModalConfirmButton"]');
    confirmButton.simulate('click');

    expect(onConfirm).not.toHaveBeenCalled();

    input.simulate('change', { target: { value: 'My Space' } });
    confirmButton.simulate('click');

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
