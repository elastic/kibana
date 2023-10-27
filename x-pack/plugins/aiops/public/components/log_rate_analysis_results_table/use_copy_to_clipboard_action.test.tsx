/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { render, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';

import type { SignificantTerm } from '@kbn/ml-agg-utils';

import { finalSignificantTermGroups } from '../../../common/__mocks__/artificial_logs/final_significant_term_groups';
import { significantTerms } from '../../../common/__mocks__/artificial_logs/significant_terms';

import { getGroupTableItems } from './get_group_table_items';
import { useCopyToClipboardAction } from './use_copy_to_clipboard_action';
import type { GroupTableItem } from './types';

interface Action {
  render: (tableItem: SignificantTerm | GroupTableItem) => ReactElement;
}

const execCommandMock = (global.document.execCommand = jest.fn());
const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('useCopyToClipboardAction', () => {
  it('renders the action for a single significant term', async () => {
    execCommandMock.mockImplementationOnce(() => true);
    const { result } = renderHook(() => useCopyToClipboardAction());
    const { findByText, getByTestId } = render(
      (result.current as Action).render(significantTerms[0])
    );

    const button = getByTestId('aiopsTableActionButtonCopyToClipboard enabled');

    userEvent.hover(button);

    // The tooltip from EUI takes 250ms to appear, so we must
    // use a `find*` query to asynchronously poll for it.
    expect(
      await findByText('Copy field/value pair as KQL syntax to clipboard')
    ).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(button);
    });

    // EUI implements copy-to-clipboard with deprecated `document.execCommand`.
    // We can assert that is has been triggered, but the combo with jsdom doesn't
    // give us a way to assert the actual value that has been copied to the clipboard.
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(warn).not.toHaveBeenCalled();
  });

  it('renders the action for a group of items', async () => {
    execCommandMock.mockImplementationOnce(() => true);
    const groupTableItems = getGroupTableItems(finalSignificantTermGroups);
    const { result } = renderHook(useCopyToClipboardAction);
    const { findByText, getByText } = render((result.current as Action).render(groupTableItems[0]));

    const button = getByText('Copy to clipboard');

    userEvent.hover(button);

    // The tooltip from EUI takes 250ms to appear, so we must
    // use a `find*` query to asynchronously poll for it.
    expect(await findByText('Copy group items as KQL syntax to clipboard')).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(button);
    });

    // EUI implements copy-to-clipboard with deprecated `document.execCommand`.
    // We can assert that is has been triggered, but the combo with jsdom doesn't
    // give us a way to assert the actual value that has been copied to the clipboard.
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(warn).not.toHaveBeenCalled();
  });
});
