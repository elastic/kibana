/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SpacesSavedObjectSchemas } from './schemas';

describe('8.7.0', () => {
  describe('fields not required', () => {
    it('should not throw an error because no schema fields are currently required', () => {
      expect(() => SpacesSavedObjectSchemas['8.7.0'].validate({})).not.toThrowError();
    });
  });

  describe('description', () => {
    it('should be a string', () => {
      expect(() =>
        SpacesSavedObjectSchemas['8.7.0'].validate({ description: 1 })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[description]: expected value of type [string] but got [number]"`
      );

      expect(() =>
        SpacesSavedObjectSchemas['8.7.0'].validate({ description: 'a' })
      ).not.toThrowError();
    });
  });

  describe('initials', () => {
    it('should be a string', () => {
      expect(() =>
        SpacesSavedObjectSchemas['8.7.0'].validate({ initials: 1 })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[initials]: expected value of type [string] but got [number]"`
      );

      expect(() =>
        SpacesSavedObjectSchemas['8.7.0'].validate({ initials: 'a' })
      ).not.toThrowError();
    });
  });

  describe('color', () => {
    it('should be a string', () => {
      expect(() =>
        SpacesSavedObjectSchemas['8.7.0'].validate({ color: 1 })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[color]: expected value of type [string] but got [number]"`
      );

      expect(() => SpacesSavedObjectSchemas['8.7.0'].validate({ color: 'a' })).not.toThrowError();
    });
  });
  describe('disabledFeatures', () => {
    it('should be a string', () => {
      expect(() =>
        SpacesSavedObjectSchemas['8.7.0'].validate({ disabledFeatures: 1 })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[disabledFeatures]: expected value of type [string] but got [number]"`
      );

      expect(() =>
        SpacesSavedObjectSchemas['8.7.0'].validate({ disabledFeatures: 'a' })
      ).not.toThrowError();
    });
  });

  describe('imageUrl', () => {
    it('should be a string', () => {
      expect(() =>
        SpacesSavedObjectSchemas['8.7.0'].validate({ imageUrl: 1 })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[imageUrl]: expected value of type [string] but got [number]"`
      );

      expect(() =>
        SpacesSavedObjectSchemas['8.7.0'].validate({ imageUrl: 'a' })
      ).not.toThrowError();
    });
  });

  describe('_reserved', () => {
    it('should be a boolean', () => {
      expect(() =>
        SpacesSavedObjectSchemas['8.7.0'].validate({ _reserved: 1 })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[_reserved]: expected value of type [boolean] but got [number]"`
      );

      expect(() =>
        SpacesSavedObjectSchemas['8.7.0'].validate({ _reserved: true })
      ).not.toThrowError();
    });
  });
});
