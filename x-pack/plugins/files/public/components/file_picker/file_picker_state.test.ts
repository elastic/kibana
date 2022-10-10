/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestScheduler } from 'rxjs/testing';
import { tap } from 'rxjs';
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
      expectObservable(filePickerState.size$).toBe('a-b-c-', {
        a: 0,
        b: 1,
        c: 2,
      });
      flush();
      expect(filePickerState.isEmpty()).toBe(false);
      expect(filePickerState.getFileIds()).toEqual(['a', 'b']);
    });
  });
});
