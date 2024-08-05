/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { SessionStorageType } from './use_markdown_session_storage';
import { useMarkdownSessionStorage } from './use_markdown_session_storage';
import { waitForComponentToUpdate } from '../../common/test_utils';

describe('useMarkdownSessionStorage', () => {
  const field = {
    label: '',
    helpText: '',
    type: '',
    value: 'test',
    errors: [],
    onChange: jest.fn(),
    setValue: jest.fn(),
    setErrors: jest.fn(),
    reset: jest.fn(),
  } as unknown as FieldHook<string>;

  const sessionKey = 'testKey';
  const initialValue = '';

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    sessionStorage.removeItem(sessionKey);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return hasConflicts as false', async () => {
    const { result, waitFor } = renderHook(() =>
      useMarkdownSessionStorage({ field, sessionKey, initialValue })
    );

    await waitFor(() => {
      expect(result.current.hasConflicts).toBe(false);
    });
  });

  it('should return hasConflicts as false when sessionKey is empty', async () => {
    const { result, waitFor } = renderHook(() =>
      useMarkdownSessionStorage({ field, sessionKey: '', initialValue })
    );

    await waitFor(() => {
      expect(field.setValue).not.toHaveBeenCalled();
      expect(result.current.hasConflicts).toBe(false);
    });
  });

  it('should update the session value with field value when it is first render', async () => {
    const { waitFor } = renderHook<SessionStorageType, { hasConflicts: boolean }>(
      (props) => {
        return useMarkdownSessionStorage(props);
      },
      {
        initialProps: { field, sessionKey, initialValue },
      }
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(sessionStorage.getItem(sessionKey)).toBe(field.value);
    });
  });

  it('should set session storage when field has value and session key is not created yet', async () => {
    const specialCharsValue = '!{tooltip[Hello again](This is tooltip!)}';
    const { waitFor, result } = renderHook<SessionStorageType, { hasConflicts: boolean }>(
      (props) => {
        return useMarkdownSessionStorage(props);
      },
      {
        initialProps: { field: { ...field, value: specialCharsValue }, sessionKey, initialValue },
      }
    );

    expect(sessionStorage.getItem(sessionKey)).toBe('');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitForComponentToUpdate();

    await waitFor(() => {
      expect(result.current.hasConflicts).toBe(false);
      expect(sessionStorage.getItem(sessionKey)).toBe(specialCharsValue);
    });
  });

  it('should update session value ', async () => {
    const { result, rerender, waitFor } = renderHook<SessionStorageType, { hasConflicts: boolean }>(
      (props) => {
        return useMarkdownSessionStorage(props);
      },
      {
        initialProps: { field, sessionKey, initialValue },
      }
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    rerender({ field: { ...field, value: 'new value' }, sessionKey, initialValue });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitForComponentToUpdate();

    await waitFor(() => {
      expect(result.current.hasConflicts).toBe(false);
      expect(sessionStorage.getItem(sessionKey)).toBe('new value');
    });
  });

  it('should return has conflict true', async () => {
    const { result, rerender, waitFor } = renderHook<SessionStorageType, { hasConflicts: boolean }>(
      (props) => {
        return useMarkdownSessionStorage(props);
      },
      { initialProps: { field, sessionKey, initialValue } }
    );

    rerender({ field, sessionKey, initialValue: 'updated' });

    await waitFor(() => {
      expect(result.current.hasConflicts).toBe(true);
    });
  });

  describe('existing session key', () => {
    beforeEach(() => {
      sessionStorage.setItem(sessionKey, 'existing session storage value');
    });

    afterEach(() => {
      sessionStorage.removeItem(sessionKey);
    });

    it('should set field value if session already exists and it is a first render', async () => {
      const { waitFor, result } = renderHook<SessionStorageType, { hasConflicts: boolean }>(
        (props) => {
          return useMarkdownSessionStorage(props);
        },
        {
          initialProps: { field, sessionKey, initialValue },
        }
      );

      await waitForComponentToUpdate();

      await waitFor(() => {
        expect(field.setValue).toHaveBeenCalled();
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitForComponentToUpdate();

      await waitFor(() => {
        expect(result.current.hasConflicts).toBe(false);
        expect(field.value).toBe(sessionStorage.getItem(sessionKey));
      });
    });

    it('should update existing session key if field value changed', async () => {
      const { waitFor, rerender, result } = renderHook<
        SessionStorageType,
        { hasConflicts: boolean }
      >(
        (props) => {
          return useMarkdownSessionStorage(props);
        },
        {
          initialProps: { field, sessionKey, initialValue },
        }
      );

      await waitForComponentToUpdate();

      await waitFor(() => {
        expect(field.setValue).toHaveBeenCalled();
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      rerender({ field: { ...field, value: 'new value' }, sessionKey, initialValue });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitForComponentToUpdate();

      await waitFor(() => {
        expect(result.current.hasConflicts).toBe(false);
        expect(sessionStorage.getItem(sessionKey)).toBe('new value');
      });
    });
  });
});
