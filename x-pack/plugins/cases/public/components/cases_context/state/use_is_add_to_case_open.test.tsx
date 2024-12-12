/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useCasesAddToExistingCaseModal } from '../../all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import { createAppMockRenderer } from '../../../common/mock';
import { useIsAddToCaseOpen } from './use_is_add_to_case_open';
import { useCasesToast } from '../../../common/use_cases_toast';
import { useCasesAddToNewCaseFlyout } from '../../create/flyout/use_cases_add_to_new_case_flyout';

jest.mock('../../../common/use_cases_toast');
const useCasesToastMock = useCasesToast as jest.Mock;
useCasesToastMock.mockReturnValue({
  showInfoToast: jest.fn(),
});

const { AppWrapper } = createAppMockRenderer();

describe('use is add to existing case modal open hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw if called outside of a cases context', () => {
    expect(() => renderHook(useIsAddToCaseOpen)).toThrow(
      /useCasesStateContext must be used within a CasesProvider and have a defined value/
    );
  });

  it('should return false when the add to case modal and flyout are not open', async () => {
    const { result } = renderHook(useIsAddToCaseOpen, { wrapper: AppWrapper });
    expect(result.current).toEqual(false);
  });

  it('should return true when the add to existing case modal opens', async () => {
    const { result, rerender } = renderHook(
      () => {
        return {
          modal: useCasesAddToExistingCaseModal(),
          isOpen: useIsAddToCaseOpen(),
        };
      },
      { wrapper: AppWrapper }
    );

    expect(result.current.isOpen).toEqual(false);
    act(() => {
      result.current.modal.open();
    });
    rerender();
    expect(result.current.isOpen).toEqual(true);
  });

  it('should return true when the add to new case flyout opens', async () => {
    const { result, rerender } = renderHook(
      () => {
        return {
          flyout: useCasesAddToNewCaseFlyout(),
          isOpen: useIsAddToCaseOpen(),
        };
      },
      { wrapper: AppWrapper }
    );

    expect(result.current.isOpen).toEqual(false);
    act(() => {
      result.current.flyout.open();
    });
    rerender();
    expect(result.current.isOpen).toEqual(true);
  });
});
