/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';

import { FilterPopover } from '.';

// FLAKY: https://github.com/elastic/kibana/issues/176679
// FLAKY: https://github.com/elastic/kibana/issues/176680
// FLAKY: https://github.com/elastic/kibana/issues/176681
// FLAKY: https://github.com/elastic/kibana/issues/176682
// FLAKY: https://github.com/elastic/kibana/issues/176683
// FLAKY: https://github.com/elastic/kibana/issues/176684
// FLAKY: https://github.com/elastic/kibana/issues/176685
// FLAKY: https://github.com/elastic/kibana/issues/176686
describe.skip('FilterPopover ', () => {
  let appMockRender: AppMockRenderer;
  const onSelectedOptionsChanged = jest.fn();
  const tags: string[] = ['coke', 'pepsi'];

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders button label correctly', () => {
    const { getByTestId } = appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={['coke']}
        options={tags}
      />
    );

    expect(getByTestId('options-filter-popover-button-Tags')).toBeInTheDocument();
  });

  it('renders empty label correctly', async () => {
    const { getByTestId, getByText } = appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[]}
        options={[]}
        optionsEmptyLabel="No options available"
      />
    );

    userEvent.click(getByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    expect(getByText('No options available')).toBeInTheDocument();
  });

  it('renders string type options correctly', async () => {
    const { getByTestId } = appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={['coke']}
        options={tags}
      />
    );

    userEvent.click(getByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    expect(getByTestId(`options-filter-popover-item-${tags[0]}`)).toBeInTheDocument();
    expect(getByTestId(`options-filter-popover-item-${tags[1]}`)).toBeInTheDocument();
  });

  it('should call onSelectionChange with selected option', async () => {
    const { getByTestId } = appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[]}
        options={tags}
      />
    );

    userEvent.click(getByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    userEvent.click(getByTestId(`options-filter-popover-item-${tags[0]}`));

    expect(onSelectedOptionsChanged).toHaveBeenCalledWith([tags[0]]);
  });

  it('should call onSelectionChange with empty array when option is deselected', async () => {
    const { getByTestId } = appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[tags[0]]}
        options={tags}
      />
    );

    userEvent.click(getByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    userEvent.click(getByTestId(`options-filter-popover-item-${tags[0]}`));

    expect(onSelectedOptionsChanged).toHaveBeenCalledWith([]);
  });

  describe('maximum limit', () => {
    const newTags = ['coke', 'pepsi', 'sprite', 'juice', 'water'];
    const maxLength = 3;
    const maxLengthLabel = `You have selected maximum number of ${maxLength} tags to filter`;

    it('should show message when maximum options are selected', async () => {
      const { getByTestId } = appMockRender.render(
        <FilterPopover
          buttonLabel={'Tags'}
          onSelectedOptionsChanged={onSelectedOptionsChanged}
          selectedOptions={[...newTags.slice(0, 3)]}
          options={newTags}
          limit={maxLength}
          limitReachedMessage={maxLengthLabel}
        />
      );

      userEvent.click(getByTestId('options-filter-popover-button-Tags'));

      await waitForEuiPopoverOpen();

      expect(getByTestId('maximum-length-warning')).toHaveTextContent(maxLengthLabel);

      expect(getByTestId(`options-filter-popover-item-${newTags[3]}`)).toHaveProperty('disabled');
      expect(getByTestId(`options-filter-popover-item-${newTags[4]}`)).toHaveProperty('disabled');
    });

    it('should not show message when maximum length label is missing', async () => {
      const { getByTestId, queryByTestId } = appMockRender.render(
        <FilterPopover
          buttonLabel={'Tags'}
          onSelectedOptionsChanged={onSelectedOptionsChanged}
          selectedOptions={[newTags[0], newTags[2]]}
          options={newTags}
          limit={maxLength}
        />
      );

      userEvent.click(getByTestId('options-filter-popover-button-Tags'));

      await waitForEuiPopoverOpen();

      expect(queryByTestId('maximum-length-warning')).not.toBeInTheDocument();
      expect(getByTestId(`options-filter-popover-item-${newTags[3]}`)).toHaveProperty('disabled');
      expect(getByTestId(`options-filter-popover-item-${newTags[4]}`)).toHaveProperty('disabled');
    });

    it('should not show message and disable options when maximum length property is missing', async () => {
      const { getByTestId, queryByTestId } = appMockRender.render(
        <FilterPopover
          buttonLabel={'Tags'}
          onSelectedOptionsChanged={onSelectedOptionsChanged}
          selectedOptions={[newTags[0], newTags[2]]}
          options={newTags}
          limitReachedMessage={maxLengthLabel}
        />
      );

      userEvent.click(getByTestId('options-filter-popover-button-Tags'));

      await waitForEuiPopoverOpen();

      expect(queryByTestId('maximum-length-warning')).not.toBeInTheDocument();
      expect(getByTestId(`options-filter-popover-item-${newTags[4]}`)).toHaveProperty(
        'disabled',
        false
      );
    });

    it('should allow to select more options when maximum length property is missing', async () => {
      const { getByTestId } = appMockRender.render(
        <FilterPopover
          buttonLabel={'Tags'}
          onSelectedOptionsChanged={onSelectedOptionsChanged}
          selectedOptions={[newTags[0], newTags[2]]}
          options={newTags}
        />
      );

      userEvent.click(getByTestId('options-filter-popover-button-Tags'));

      await waitForEuiPopoverOpen();

      userEvent.click(getByTestId(`options-filter-popover-item-${newTags[1]}`));

      expect(onSelectedOptionsChanged).toHaveBeenCalledWith([newTags[0], newTags[2], newTags[1]]);
    });
  });
});
