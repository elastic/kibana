/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';

import { ConfirmDeleteModal } from './confirm_delete_modal';
import { spacesManagerMock } from '../../../spaces_manager/mocks';

describe('ConfirmDeleteModal', () => {
  it('renders as expected', () => {
    const space = {
      id: 'my-space',
      name: 'My Space',
      disabledFeatures: [],
    };

    const spacesManager = spacesManagerMock.create();
    const onCancel = jest.fn();

    expect(
      shallowWithIntl(
        <ConfirmDeleteModal space={space} spacesManager={spacesManager} onCancel={onCancel} />
      )
    ).toMatchInlineSnapshot(`
      <EuiConfirmModal
        buttonColor="danger"
        cancelButtonText="Cancel"
        confirmButtonText="Delete space and all contents"
        isLoading={false}
        onCancel={[MockFunction]}
        onConfirm={[Function]}
        title="Delete space 'My Space'?"
      >
        <EuiText>
          <p>
            <MemoizedFormattedMessage
              defaultMessage="This space and {allContents} will be permanently deleted."
              id="xpack.spaces.management.confirmDeleteModal.description"
              values={
                Object {
                  "allContents": <strong>
                    <Memo(MemoizedFormattedMessage)
                      defaultMessage="all contents"
                      id="xpack.spaces.management.confirmDeleteModal.allContents"
                    />
                  </strong>,
                }
              }
            />
          </p>
          <p>
            <MemoizedFormattedMessage
              defaultMessage="You can't recover deleted spaces."
              id="xpack.spaces.management.confirmDeleteModal.cannotUndoWarning"
            />
          </p>
        </EuiText>
      </EuiConfirmModal>
    `);
  });

  it('deletes the space when confirmed', async () => {
    const space = {
      id: 'my-space',
      name: 'My Space',
      disabledFeatures: [],
    };

    const spacesManager = spacesManagerMock.create();
    const onCancel = jest.fn();
    const onSuccess = jest.fn();

    const wrapper = mountWithIntl(
      <ConfirmDeleteModal
        space={space}
        spacesManager={spacesManager}
        onCancel={onCancel}
        onSuccess={onSuccess}
      />
    );

    await act(async () => {
      wrapper.find('button[data-test-subj="confirmModalConfirmButton"]').simulate('click');
      await spacesManager.deleteSpace.mock.results[0];
    });

    expect(spacesManager.deleteSpace).toHaveBeenLastCalledWith(space);
  });
});
