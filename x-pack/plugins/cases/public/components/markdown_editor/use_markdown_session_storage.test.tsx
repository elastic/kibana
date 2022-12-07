/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import { useMarkdownSessionStorage } from './use_markdown_session_storage';

describe('useMarkdownSessionStorage', () => {
  let store: Record<string, any> = {};
  const draftStorageKey = `cases.caseView.caseId.markdown-id.markdownEditor`;
  const initialValue = '';
  const fieldProps: Record<string, any> = {
    value: 'new comment',
    setValue: jest.fn(),
    path: 'content',
  };
  const field: FieldHook<string> = <UseField path="name" {...fieldProps} />;

  beforeAll(() => {
    Object.defineProperty(window as any, 'sessionStorage', {
      value: {
        clear: jest.fn().mockImplementation(() => (store = {})),
        getItem: jest.fn().mockImplementation((key: string) => store[key]),
        setItem: jest.fn().mockImplementation((key: string, value: string) => (store[key] = value)),
        removeItem: jest.fn().mockImplementation((key: string) => delete store[key]),
      },
      writable: true,
    });
  });

  it('should add new key to session storage', () => {
    const { result } = renderHook(() =>
      useMarkdownSessionStorage({
        field,
        sessionKey: draftStorageKey,
        initialValue,
      })
    );

    expect(result.current.hasConflicts).toBeFalsy();
    expect(window.sessionStorage.setItem).toHaveBeenCalledWith(draftStorageKey, field.value);
  });

  it('should return value if key exists', () => {
    const { result } = renderHook(() =>
      useMarkdownSessionStorage({
        field,
        sessionKey: draftStorageKey,
        initialValue,
      })
    );

    const sessionValue = window.sessionStorage.getItem(draftStorageKey);

    expect(result.current.hasConflicts).toBeFalsy();
    expect(sessionValue).toEqual(field.value);
  });

  afterAll(() => {
    delete (window as any).sessionStorage;
  });
});
