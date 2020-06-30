/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ExportTypesRegistry } from '../export_types_registry';

describe('ExportTypesRegistry', function () {
  let exportTypesRegistry;
  beforeEach(function () {
    exportTypesRegistry = new ExportTypesRegistry();
  });

  describe('register', function () {
    it(`doesn't throw an Error when using a new type with a string id`, function () {
      expect(() => {
        exportTypesRegistry.register({ id: 'foo' });
      }).to.not.throwError();
    });

    it('throws an Error when registering a type without an id', function () {
      expect(() => {
        exportTypesRegistry.register({});
      }).to.throwError();
    });

    it('throws an Error when registering a type with an integer id', function () {
      expect(() => {
        exportTypesRegistry.register({ id: 1 });
      }).to.throwError();
    });

    it('throws an Error when registering the same id twice', function () {
      const id = 'foo';
      expect(() => {
        exportTypesRegistry.register({ id });
      }).to.not.throwError();

      expect(() => {
        exportTypesRegistry.register({ id });
      }).to.throwError();
    });
  });

  describe('getById', function () {
    it('returns the same object that was registered', function () {
      const id = 'foo';
      const obj = { id };
      exportTypesRegistry.register(obj);
      exportTypesRegistry.register({ id: 'bar' });
      expect(exportTypesRegistry.getById(id)).to.be(obj);
    });

    it(`throws an Error if the id isn't found`, function () {
      expect(() => {
        exportTypesRegistry.getById('foo');
      }).to.throwError();
    });
  });

  describe('getAll', function () {
    it('returns an empty Iterator if no objects have been registered', function () {
      const array = Array.from(exportTypesRegistry.getAll());
      expect(array.length).to.be(0);
    });

    it('returns all objects that have been registered', function () {
      const obj1 = { id: 'foo' };
      const obj2 = { id: 'bar' };
      const objs = [obj1, obj2];
      objs.forEach((obj) => exportTypesRegistry.register(obj));
      const all = Array.from(exportTypesRegistry.getAll());
      expect(all).to.contain(obj1);
      expect(all).to.contain(obj2);
    });
  });

  describe('getSize', function () {
    it('returns 0 initially', function () {
      const size = exportTypesRegistry.getSize();
      expect(size).to.be(0);
    });

    it('returns the number of objects that have been added', function () {
      exportTypesRegistry.register({ id: 'foo' });
      exportTypesRegistry.register({ id: 'bar' });
      exportTypesRegistry.register({ id: 'baz' });
      const size = exportTypesRegistry.getSize();
      expect(size).to.be(3);
    });
  });

  describe('get', function () {
    it('returns obj that matches the predicate', function () {
      const prop = 'fooProp';
      const match = { id: 'foo', prop };
      [match, { id: 'bar' }, { id: 'baz' }].forEach((obj) => exportTypesRegistry.register(obj));
      expect(exportTypesRegistry.get((item) => item.prop === prop)).to.be(match);
    });

    it('throws Error if multiple items match predicate', function () {
      const prop = 'fooProp';
      [
        { id: 'foo', prop },
        { id: 'bar', prop },
      ].forEach((obj) => exportTypesRegistry.register(obj));
      expect(() => {
        exportTypesRegistry.get((item) => item.prop === prop);
      }).to.throwError();
    });

    it('throws Error if no items match predicate', function () {
      const prop = 'fooProp';
      [
        { id: 'foo', prop },
        { id: 'bar', prop },
      ].forEach((obj) => exportTypesRegistry.register(obj));
      expect(() => {
        exportTypesRegistry.get((item) => item.prop !== prop);
      }).to.throwError();
    });
  });
});
