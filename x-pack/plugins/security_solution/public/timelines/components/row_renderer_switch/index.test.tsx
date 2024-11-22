/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import { createMockStore, mockGlobalState, TestProviders } from '../../../common/mock';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { RowRendererSwitch } from '.';
import { TimelineId } from '../../../../common/types';
import { RowRendererValues } from '../../../../common/api/timeline';

const localState = structuredClone(mockGlobalState);

// exclude all row renderers by default
localState.timeline.timelineById[TimelineId.test].excludedRowRendererIds = RowRendererValues;

const renderTestComponent = (props?: ComponentProps<typeof TestProviders>) => {
  const store = props?.store ?? createMockStore(localState);
  return render(
    <TestProviders {...props} store={store}>
      <RowRendererSwitch timelineId={TimelineId.test} />
    </TestProviders>
  );
};

describe('Row Renderer Switch', () => {
  it('should render correctly', () => {
    const { getByTestId } = renderTestComponent();

    expect(getByTestId('row-renderer-switch')).toBeVisible();
    expect(getByTestId('row-renderer-switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('should successfully enable all row renderers', async () => {
    const localStore = createMockStore(localState);
    const { getByTestId } = renderTestComponent({ store: localStore });

    fireEvent.click(getByTestId('row-renderer-switch'));

    await waitFor(() => {
      expect(getByTestId('row-renderer-switch')).toHaveAttribute('aria-checked', 'true');

      expect(
        localStore.getState().timeline.timelineById[TimelineId.test].excludedRowRendererIds
      ).toMatchObject([]);
    });
  });

  it('should successfully disable all row renderers', async () => {
    const localStore = createMockStore(localState);
    const { getByTestId } = renderTestComponent({ store: localStore });

    // enable all row renderers
    fireEvent.click(getByTestId('row-renderer-switch'));

    await waitFor(() => {
      expect(getByTestId('row-renderer-switch')).toHaveAttribute('aria-checked', 'true');
    });

    // disable all row renderers
    fireEvent.click(getByTestId('row-renderer-switch'));

    await waitFor(() => {
      expect(getByTestId('row-renderer-switch')).toHaveAttribute('aria-checked', 'false');
      expect(
        localStore.getState().timeline.timelineById[TimelineId.test].excludedRowRendererIds
      ).toMatchObject(RowRendererValues);
    });
  });
});
