/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor, fireEvent } from '@testing-library/react';
import { useWhichFlyout } from '../../document_details/shared/hooks/use_which_flyout';
import { useOnExpandableFlyoutClose } from './use_on_expandable_flyout_close';
import { Flyouts } from '../../document_details/shared/constants/flyouts';
import { TIMELINE_ON_CLOSE_EVENT } from '../..';

jest.mock('../../document_details/shared/hooks/use_which_flyout');

describe('useOnExpandableFlyoutClose', () => {
  const callbackFct = jest.fn().mockImplementation((id: string) => {});

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should run the callback function and remove the event listener from the window', async () => {
    (useWhichFlyout as jest.Mock).mockReturnValue(Flyouts.timeline);

    const removeListenerSpy = jest.spyOn(window, 'removeEventListener');

    removeListenerSpy.mockImplementationOnce((event, callback) => {});

    const { unmount } = renderHook(() => useOnExpandableFlyoutClose({ callback: callbackFct }));

    fireEvent(
      window,
      new CustomEvent(TIMELINE_ON_CLOSE_EVENT, {
        detail: Flyouts.timeline,
      })
    );

    await waitFor(() => expect(callbackFct).toHaveBeenCalled());

    expect(callbackFct).toHaveBeenCalledWith(Flyouts.timeline);

    unmount();

    expect(removeListenerSpy).toHaveBeenCalled();
  });

  it('should add event listener to window', async () => {
    (useWhichFlyout as jest.Mock).mockReturnValue(Flyouts.securitySolution);

    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    addEventListenerSpy.mockImplementationOnce((event, callback) => {});

    renderHook(() => useOnExpandableFlyoutClose({ callback: callbackFct }));

    await waitFor(() => expect(addEventListenerSpy).toHaveBeenCalled());
  });
});
