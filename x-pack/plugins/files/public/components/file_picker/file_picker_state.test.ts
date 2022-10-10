/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestScheduler } from 'rxjs/testing';
import { merge, tap } from 'rxjs';
import { FilePickerState } from './file_picker_state';

const getTestScheduler = () =>
  new TestScheduler((actual, expected) => expect(actual).toEqual(expected));

describe('FilePickerState', () => {
  let filePickerState: FilePickerState;
  beforeEach(() => {
    filePickerState = new FilePickerState();
  });
  it('starts off empty', () => {
    expect(filePickerState.isEmpty()).toBe(true);
  });
  it('updates when files are added', () => {
    getTestScheduler().run(({ expectObservable, cold, flush }) => {
      const addFiles$ = cold('--a-b|').pipe(tap((id) => filePickerState.addFile(id)));
      expectObservable(addFiles$).toBe('--a-b|');
      expectObservable(filePickerState.fileIds$).toBe('a-b-c-', {
        a: [],
        b: ['a'],
        c: ['a', 'b'],
      });
      flush();
      expect(filePickerState.isEmpty()).toBe(false);
      expect(filePickerState.getFileIds()).toEqual(['a', 'b']);
    });
  });
  it('updates when files are removed', () => {
    getTestScheduler().run(({ expectObservable, cold, flush }) => {
      const addFiles$ = cold('   --a-b---c|').pipe(tap((id) => filePickerState.addFile(id)));
      const removeFiles$ = cold('------a|').pipe(tap((id) => filePickerState.removeFile(id)));
      expectObservable(merge(addFiles$, removeFiles$)).toBe('--a-b-a-c|');
      expectObservable(filePickerState.fileIds$).toBe('a-b-c-d-e-', {
        a: [],
        b: ['a'],
        c: ['a', 'b'],
        d: ['b'],
        e: ['b', 'c'],
      });
      flush();
      expect(filePickerState.isEmpty()).toBe(false);
      expect(filePickerState.getFileIds()).toEqual(['b', 'c']);
    });
  });
  it('does not add duplicates', () => {
    getTestScheduler().run(({ expectObservable, cold, flush }) => {
      const addFiles$ = cold('--a-b-a-a-a|').pipe(tap((id) => filePickerState.addFile(id)));
      expectObservable(addFiles$).toBe('--a-b-a-a-a|');
      expectObservable(filePickerState.fileIds$).toBe('a-b-c-d-e-f-', {
        a: [],
        b: ['a'],
        c: ['a', 'b'],
        d: ['a', 'b'],
        e: ['a', 'b'],
        f: ['a', 'b'],
      });
      flush();
      expect(filePickerState.isEmpty()).toBe(false);
      expect(filePickerState.getFileIds()).toEqual(['a', 'b']);
    });
  });
});
