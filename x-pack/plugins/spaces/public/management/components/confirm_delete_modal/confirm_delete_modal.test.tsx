/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, shallowWithIntl } from '@kbn/test/jest';
import { ConfirmDeleteModal } from './confirm_delete_modal';
import { spacesManagerMock } from '../../../spaces_manager/mocks';
import { SpacesManager } from '../../../spaces_manager';

describe('ConfirmDeleteModal', () => {
  it('renders as expected', () => {
    const space = {
      id: 'my-space',
      name: 'My Space',
      disabledFeatures: [],
    };

    const spacesManager = spacesManagerMock.create();
    spacesManager.getActiveSpace.mockResolvedValue(space);

    const onCancel = jest.fn();
    const onConfirm = jest.fn();

    expect(
      shallowWithIntl(
        <ConfirmDeleteModal.WrappedComponent
          space={space}
          spacesManager={(spacesManager as unknown) as SpacesManager}
          onCancel={onCancel}
          onConfirm={onConfirm}
          intl={null as any}
        />
      )
    ).toMatchSnapshot();
  });

  it(`requires the space name to be typed before confirming`, () => {
    const space = {
      id: 'my-space',
      name: 'My Space',
      disabledFeatures: [],
    };

    const spacesManager = spacesManagerMock.create();
    spacesManager.getActiveSpace.mockResolvedValue(space);

    const onCancel = jest.fn();
    const onConfirm = jest.fn();

    const wrapper = mountWithIntl(
      <ConfirmDeleteModal.WrappedComponent
        space={space}
        spacesManager={(spacesManager as unknown) as SpacesManager}
        onCancel={onCancel}
        onConfirm={onConfirm}
        intl={null as any}
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
