/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import type { ReactWrapper } from 'enzyme';
import React from 'react';

import { findTestSubject, mountWithIntl, nextTick, shallowWithIntl } from '@kbn/test-jest-helpers';

import type { SummarizedCopyToSpaceResult } from '../lib';
import type { ImportRetry } from '../types';
import type { ResolveAllConflictsProps } from './resolve_all_conflicts';
import { ResolveAllConflicts } from './resolve_all_conflicts';

describe('ResolveAllConflicts', () => {
  const summarizedCopyResult = {
    objects: [
      // these objects have minimal attributes to exercise test scenarios; these are not fully realistic results
      { type: 'type-1', id: 'id-1', conflict: undefined }, // not a conflict
      { type: 'type-2', id: 'id-2', conflict: { error: { type: 'conflict' } } }, // conflict without a destinationId
      {
        // conflict with a destinationId
        type: 'type-3',
        id: 'id-3',
        conflict: { error: { type: 'conflict', destinationId: 'dest-3' } },
      },
      {
        // ambiguous conflict with two destinations
        type: 'type-4',
        id: 'id-4',
        conflict: {
          error: {
            type: 'ambiguous_conflict',
            destinations: [{ id: 'dest-4a' }, { id: 'dest-4b' }],
          },
        },
      },
      {
        // ambiguous conflict with two destinations (a retry already exists for dest-5b)
        type: 'type-5',
        id: 'id-5',
        conflict: {
          error: {
            type: 'ambiguous_conflict',
            destinations: [{ id: 'dest-5a' }, { id: 'dest-5b' }],
          },
        },
      },
    ],
  } as unknown as SummarizedCopyToSpaceResult;
  const retries: ImportRetry[] = [
    { type: 'type-1', id: 'id-1', overwrite: false },
    { type: 'type-5', id: 'id-5', overwrite: true, destinationId: 'dest-5b' },
  ];
  const onRetriesChange = jest.fn();
  const onDestinationMapChange = jest.fn();

  const getOverwriteOption = (wrapper: ReactWrapper) =>
    findTestSubject(wrapper, 'cts-resolve-all-conflicts-overwrite');
  const getSkipOption = (wrapper: ReactWrapper) =>
    findTestSubject(wrapper, 'cts-resolve-all-conflicts-skip');

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const props: ResolveAllConflictsProps = {
    summarizedCopyResult,
    retries,
    onRetriesChange,
    onDestinationMapChange,
  };
  const openPopover = async (wrapper: ReactWrapper) => {
    await act(async () => {
      wrapper.setState({ isPopoverOpen: true });
      await nextTick();
      wrapper.update();
    });
  };

  it('should render as expected', async () => {
    const wrapper = shallowWithIntl(<ResolveAllConflicts {...props} />);

    expect(wrapper).toMatchInlineSnapshot(`
      <EuiPopover
        anchorPosition="downLeft"
        button={
          <EuiLink
            className="spcCopyToSpace__resolveAllConflictsLink"
            onClick={[Function]}
          >
            <FormattedMessage
              defaultMessage="(resolve all)"
              id="xpack.spaces.management.copyToSpace.resolveAllConflictsLink"
              values={Object {}}
            />
          </EuiLink>
        }
        closePopover={[Function]}
        display="inlineBlock"
        hasArrow={true}
        id="resolveAllConflictsVisibilityPopover"
        isOpen={false}
        ownFocus={true}
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel
          items={
            Array [
              <EuiContextMenuItem
                data-test-subj="cts-resolve-all-conflicts-overwrite"
                onClick={[Function]}
              >
                Overwrite all
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                data-test-subj="cts-resolve-all-conflicts-skip"
                onClick={[Function]}
              >
                Skip all
              </EuiContextMenuItem>,
            ]
          }
        />
      </EuiPopover>
    `);
  });

  it('should add overwrite retries when "Overwrite all" is selected', async () => {
    const wrapper = mountWithIntl(<ResolveAllConflicts {...props} />);
    await openPopover(wrapper);
    expect(onRetriesChange).not.toHaveBeenCalled();

    getOverwriteOption(wrapper).simulate('click');
    expect(onRetriesChange).toHaveBeenCalledWith([
      { type: 'type-1', id: 'id-1', overwrite: false }, // unchanged
      { type: 'type-5', id: 'id-5', overwrite: true, destinationId: 'dest-5b' }, // unchanged
      { type: 'type-2', id: 'id-2', overwrite: true }, // added without a destinationId
      { type: 'type-3', id: 'id-3', overwrite: true, destinationId: 'dest-3' }, // added with the destinationId
      { type: 'type-4', id: 'id-4', overwrite: true, destinationId: 'dest-4a' }, // added with the first destinationId
    ]);
    expect(onDestinationMapChange).not.toHaveBeenCalled();
  });

  it('should remove overwrite retries when "Skip all" is selected', async () => {
    const wrapper = mountWithIntl(<ResolveAllConflicts {...props} />);
    await openPopover(wrapper);
    expect(onRetriesChange).not.toHaveBeenCalled();
    expect(onDestinationMapChange).not.toHaveBeenCalled();

    getSkipOption(wrapper).simulate('click');
    expect(onRetriesChange).toHaveBeenCalledWith([
      { type: 'type-1', id: 'id-1', overwrite: false }, // unchanged
    ]);
    expect(onDestinationMapChange).toHaveBeenCalledWith(undefined);
  });
});
