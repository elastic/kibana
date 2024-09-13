/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitForEuiPopoverOpen, screen } from '@elastic/eui/lib/test/rtl';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';

import { FilterPopover } from '.';

describe('FilterPopover ', () => {
  let appMockRender: AppMockRenderer;
  const onSelectedOptionsChanged = jest.fn();
  const tags: string[] = ['coke', 'pepsi'];

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await appMockRender.clearQueryCache();
  });

  it('renders button label correctly', async () => {
    appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={['coke']}
        options={tags}
      />
    );

    expect(await screen.findByTestId('options-filter-popover-button-Tags')).toBeInTheDocument();
  });

  it('renders empty label correctly', async () => {
    appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[]}
        options={[]}
        optionsEmptyLabel="No options available"
      />
    );

    await userEvent.click(await screen.findByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    expect(await screen.findByText('No options available')).toBeInTheDocument();
  });

  it('renders string type options correctly', async () => {
    appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={['coke']}
        options={tags}
      />
    );

    await userEvent.click(await screen.findByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    expect(await screen.findByTestId(`options-filter-popover-item-${tags[0]}`)).toBeInTheDocument();
    expect(await screen.findByTestId(`options-filter-popover-item-${tags[1]}`)).toBeInTheDocument();
  });

  it('should call onSelectionChange with selected option', async () => {
    appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[]}
        options={tags}
      />
    );

    await userEvent.click(await screen.findByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    await userEvent.click(await screen.findByTestId(`options-filter-popover-item-${tags[0]}`));

    await waitFor(() => {
      expect(onSelectedOptionsChanged).toHaveBeenCalledWith([tags[0]]);
    });
  });

  it('should call onSelectionChange with empty array when option is deselected', async () => {
    appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[tags[0]]}
        options={tags}
      />
    );

    await userEvent.click(await screen.findByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    await userEvent.click(await screen.findByTestId(`options-filter-popover-item-${tags[0]}`));

    await waitFor(() => {
      expect(onSelectedOptionsChanged).toHaveBeenCalledWith([]);
    });
  });

  describe('maximum limit', () => {
    const newTags = ['coke', 'pepsi', 'sprite', 'juice', 'water'];
    const maxLength = 3;
    const maxLengthLabel = `You have selected maximum number of ${maxLength} tags to filter`;

    it('should show message when maximum options are selected', async () => {
      appMockRender.render(
        <FilterPopover
          buttonLabel={'Tags'}
          onSelectedOptionsChanged={onSelectedOptionsChanged}
          selectedOptions={[...newTags.slice(0, 3)]}
          options={newTags}
          limit={maxLength}
          limitReachedMessage={maxLengthLabel}
        />
      );

      await userEvent.click(await screen.findByTestId('options-filter-popover-button-Tags'));

      await waitForEuiPopoverOpen();

      expect(await screen.findByTestId('maximum-length-warning')).toHaveTextContent(maxLengthLabel);

      expect(await screen.findByTestId(`options-filter-popover-item-${newTags[3]}`)).toHaveProperty(
        'disabled'
      );
      expect(await screen.findByTestId(`options-filter-popover-item-${newTags[4]}`)).toHaveProperty(
        'disabled'
      );
    });

    it('should not show message when maximum length label is missing', async () => {
      appMockRender.render(
        <FilterPopover
          buttonLabel={'Tags'}
          onSelectedOptionsChanged={onSelectedOptionsChanged}
          selectedOptions={[newTags[0], newTags[2]]}
          options={newTags}
          limit={maxLength}
        />
      );

      await userEvent.click(await screen.findByTestId('options-filter-popover-button-Tags'));

      await waitForEuiPopoverOpen();

      expect(screen.queryByTestId('maximum-length-warning')).not.toBeInTheDocument();
      expect(await screen.findByTestId(`options-filter-popover-item-${newTags[3]}`)).toHaveProperty(
        'disabled'
      );
      expect(await screen.findByTestId(`options-filter-popover-item-${newTags[4]}`)).toHaveProperty(
        'disabled'
      );
    });

    it('should not show message and disable options when maximum length property is missing', async () => {
      appMockRender.render(
        <FilterPopover
          buttonLabel={'Tags'}
          onSelectedOptionsChanged={onSelectedOptionsChanged}
          selectedOptions={[newTags[0], newTags[2]]}
          options={newTags}
          limitReachedMessage={maxLengthLabel}
        />
      );

      await userEvent.click(await screen.findByTestId('options-filter-popover-button-Tags'));

      await waitForEuiPopoverOpen();

      expect(screen.queryByTestId('maximum-length-warning')).not.toBeInTheDocument();
      expect(await screen.findByTestId(`options-filter-popover-item-${newTags[4]}`)).toHaveProperty(
        'disabled',
        false
      );
    });

    it('should allow to select more options when maximum length property is missing', async () => {
      appMockRender.render(
        <FilterPopover
          buttonLabel={'Tags'}
          onSelectedOptionsChanged={onSelectedOptionsChanged}
          selectedOptions={[newTags[0], newTags[2]]}
          options={newTags}
        />
      );

      await userEvent.click(await screen.findByTestId('options-filter-popover-button-Tags'));

      await waitForEuiPopoverOpen();

      await userEvent.click(await screen.findByTestId(`options-filter-popover-item-${newTags[1]}`));

      await waitFor(() => {
        expect(onSelectedOptionsChanged).toHaveBeenCalledWith([newTags[0], newTags[2], newTags[1]]);
      });
    });
  });
});
