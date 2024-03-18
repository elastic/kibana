/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import type { Note } from '../../../../../common/api/timeline';

import { pickSavedNote } from './saved_object';

describe('saved_object', () => {
  const mockDateNow = new Date('2020-04-03T23:00:00.000Z').valueOf();
  const getMockSavedNote = (): Note => ({
    noteId: '7ba7a520-03f4-11eb-9d9d-ffba20fabba8',
    version: 'WzQ0ODEsMV0=',
    note: '789',
    timelineId: '7af80430-03f4-11eb-9d9d-ffba20fabba8',
    created: 1601563414477,
    createdBy: 'Elastic',
    updated: 1601563414477,
    updatedBy: 'Elastic',
  });

  beforeAll(() => {
    Date = jest.fn(() => ({
      valueOf: jest.fn().mockReturnValue(mockDateNow),
    })) as unknown as DateConstructor;
  });

  afterAll(() => {
    (Date as unknown as jest.Mock).mockRestore();
  });

  describe('Set create / update time correctly ', () => {
    test('Creating a timeline', () => {
      const savedNote = getMockSavedNote();
      const noteId = null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedNote(noteId, savedNote, userInfo);

      expect(result.created).toEqual(mockDateNow);
      expect(result.updated).toEqual(mockDateNow);
    });

    test('Updating a timeline', () => {
      const savedNote = getMockSavedNote();
      const noteId = savedNote.noteId ?? null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedNote(noteId, savedNote, userInfo);

      expect(result.created).toEqual(savedNote.created);
      expect(result.updated).toEqual(mockDateNow);
    });
  });

  describe('Set userInfo correctly ', () => {
    test('Creating a timeline', () => {
      const savedNote = getMockSavedNote();
      const noteId = null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedNote(noteId, savedNote, userInfo);

      expect(result.createdBy).toEqual(userInfo.username);
      expect(result.updatedBy).toEqual(userInfo.username);
    });

    test('Creating a timeline with user email', () => {
      const savedNote = getMockSavedNote();
      const noteId = null;
      const userInfo = { username: 'elastic', email: 'some@email.com' } as AuthenticatedUser;
      const result = pickSavedNote(noteId, savedNote, userInfo);

      expect(result.createdBy).toEqual(userInfo.email);
      expect(result.updatedBy).toEqual(userInfo.email);
    });

    test('Creating a timeline with user full name', () => {
      const savedNote = getMockSavedNote();
      const noteId = null;
      const userInfo = {
        username: 'elastic',
        email: 'some@email.com',
        full_name: 'Some Full Name',
      } as AuthenticatedUser;
      const result = pickSavedNote(noteId, savedNote, userInfo);

      expect(result.createdBy).toEqual(userInfo.full_name);
      expect(result.updatedBy).toEqual(userInfo.full_name);
    });

    test('Updating a timeline', () => {
      const savedNote = getMockSavedNote();
      const noteId = savedNote.noteId ?? null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedNote(noteId, savedNote, userInfo);

      expect(result.createdBy).toEqual(savedNote.createdBy);
      expect(result.updatedBy).toEqual(userInfo.username);
    });

    test('Updating a timeline with user email', () => {
      const savedNote = getMockSavedNote();
      const noteId = savedNote.noteId ?? null;
      const userInfo = { username: 'elastic', email: 'some@email.com' } as AuthenticatedUser;
      const result = pickSavedNote(noteId, savedNote, userInfo);

      expect(result.createdBy).toEqual(savedNote.createdBy);
      expect(result.updatedBy).toEqual(userInfo.email);
    });

    test('Updating a timeline with user full name', () => {
      const savedNote = getMockSavedNote();
      const noteId = savedNote.noteId ?? null;
      const userInfo = {
        username: 'elastic',
        email: 'some@email.com',
        full_name: 'Some Full Name',
      } as AuthenticatedUser;
      const result = pickSavedNote(noteId, savedNote, userInfo);

      expect(result.createdBy).toEqual(savedNote.createdBy);
      expect(result.updatedBy).toEqual(userInfo.full_name);
    });
  });
});
