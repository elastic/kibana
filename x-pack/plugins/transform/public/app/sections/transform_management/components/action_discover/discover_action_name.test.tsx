/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { render, waitFor, screen } from '@testing-library/react';

import { TransformListRow } from '../../../../common';
import { isDiscoverActionDisabled, DiscoverActionName } from './discover_action_name';

import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../../app/app_dependencies');

// @ts-expect-error mock data is too loosely typed
const item: TransformListRow = transformListRow;

describe('Transform: Transform List Actions isDiscoverActionDisabled()', () => {
  it('should be disabled when more than one item is passed in', () => {
    expect(isDiscoverActionDisabled([item, item], false, true)).toBe(true);
  });
  it('should be disabled when forceDisable is true', () => {
    expect(isDiscoverActionDisabled([item], true, true)).toBe(true);
  });
  it('should be disabled when the data view is not available', () => {
    expect(isDiscoverActionDisabled([item], false, false)).toBe(true);
  });
  it('should be disabled when the transform started but has no data view', () => {
    const itemCopy = cloneDeep(item);
    itemCopy.stats.state = 'started';
    expect(isDiscoverActionDisabled([itemCopy], false, false)).toBe(true);
  });
  it('should be enabled when the transform started and has a data view', () => {
    const itemCopy = cloneDeep(item);
    itemCopy.stats.state = 'started';
    expect(isDiscoverActionDisabled([itemCopy], false, true)).toBe(false);
  });
  it('should be enabled when the data view is available', () => {
    expect(isDiscoverActionDisabled([item], false, true)).toBe(false);
  });
});

describe('Transform: Transform List Actions <StopAction />', () => {
  it('renders an enabled button', async () => {
    // prepare
    render(
      <IntlProvider locale="en">
        <DiscoverActionName items={[item]} indexPatternExists={true} />
      </IntlProvider>
    );

    // assert
    await waitFor(() => {
      expect(
        screen.queryByTestId('transformDiscoverActionNameText disabled')
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('transformDiscoverActionNameText enabled')).toBeInTheDocument();
      expect(screen.queryByText('View in Discover')).toBeInTheDocument();
    });
  });

  it('renders a disabled button', async () => {
    // prepare
    const itemCopy = cloneDeep(item);
    itemCopy.stats.checkpointing.last.checkpoint = 0;
    render(
      <IntlProvider locale="en">
        <DiscoverActionName items={[itemCopy]} indexPatternExists={false} />
      </IntlProvider>
    );

    // assert
    await waitFor(() => {
      expect(screen.queryByTestId('transformDiscoverActionNameText disabled')).toBeInTheDocument();
      expect(
        screen.queryByTestId('transformDiscoverActionNameText enabled')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('View in Discover')).toBeInTheDocument();
    });
  });
});
