/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getSyncLabel } from './sync_badge';

describe('Sync badge', () => {
  describe('Nodejs', () => {
    it('shows blocking badge', () => {
      expect(getSyncLabel('nodejs', true)).toBe('blocking');
    });
    it('does not show async badge', () => {
      expect(getSyncLabel('nodejs', false)).toBeUndefined();
    });
  });
  describe('PHP', () => {
    it('does not show blocking badge', () => {
      expect(getSyncLabel('php', true)).toBeUndefined();
    });
    it('shows async badge', () => {
      expect(getSyncLabel('php', false)).toBe('async');
    });
  });
  describe('Python', () => {
    it('does not show blocking badge', () => {
      expect(getSyncLabel('python', true)).toBeUndefined();
    });
    it('shows async badge', () => {
      expect(getSyncLabel('python', false)).toBe('async');
    });
  });
  describe('.NET', () => {
    it('does not show blocking badge', () => {
      expect(getSyncLabel('dotnet', true)).toBeUndefined();
    });
    it('shows async badge', () => {
      expect(getSyncLabel('dotnet', false)).toBe('async');
    });
  });
  describe('iOS', () => {
    it('does not show blocking badge', () => {
      expect(getSyncLabel('iOS/swift', true)).toBeUndefined();
    });
    it('shows async badge', () => {
      expect(getSyncLabel('iOS/swift', false)).toBe('async');
    });
  });
  describe('Ruby', () => {
    it('does not show blocking badge', () => {
      expect(getSyncLabel('ruby', true)).toBeUndefined();
    });
    it('shows async badge', () => {
      expect(getSyncLabel('ruby', false)).toBe('async');
    });
  });
  describe('Java', () => {
    it('does not show blocking badge', () => {
      expect(getSyncLabel('java', true)).toBeUndefined();
    });
    it('shows async badge', () => {
      expect(getSyncLabel('java', false)).toBe('async');
    });
  });
  describe('JS', () => {
    it('shows blocking badge', () => {
      expect(getSyncLabel('js-base', true)).toBe('blocking');
    });
    it('does not show async badge', () => {
      expect(getSyncLabel('js-base', false)).toBeUndefined();
    });
  });
  describe('RUM', () => {
    it('shows blocking badge', () => {
      expect(getSyncLabel('rum-js', true)).toBe('blocking');
    });
    it('does not show async badge', () => {
      expect(getSyncLabel('rum-js', false)).toBeUndefined();
    });
  });
});
