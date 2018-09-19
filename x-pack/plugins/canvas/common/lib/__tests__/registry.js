/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { Registry } from '../registry';

function validateRegistry(registry, elements) {
  it('gets items by lookup property', () => {
    expect(registry.get('__test2')).to.eql(elements[1]());
  });

  it('ignores case when getting items', () => {
    expect(registry.get('__TeSt2')).to.eql(elements[1]());
    expect(registry.get('__tESt2')).to.eql(elements[1]());
  });

  it('gets a shallow clone', () => {
    expect(registry.get('__test2')).to.not.equal(elements[1]());
  });

  it('is null with no match', () => {
    expect(registry.get('@@nope_nope')).to.be(null);
  });

  it('returns shallow clone of the whole registry via toJS', () => {
    const regAsJs = registry.toJS();
    expect(regAsJs).to.eql({
      __test1: elements[0](),
      __test2: elements[1](),
    });
    expect(regAsJs.__test1).to.eql(elements[0]());
    expect(regAsJs.__test1).to.not.equal(elements[0]());
  });

  it('returns shallow clone array via toArray', () => {
    const regAsArray = registry.toArray();
    expect(regAsArray).to.be.an(Array);
    expect(regAsArray[0]).to.eql(elements[0]());
    expect(regAsArray[0]).to.not.equal(elements[0]());
  });

  it('resets the registry', () => {
    expect(registry.get('__test2')).to.eql(elements[1]());
    registry.reset();
    expect(registry.get('__test2')).to.equal(null);
  });
}

describe('Registry', () => {
  describe('name registry', () => {
    const elements = [
      () => ({
        name: '__test1',
        prop1: 'some value',
      }),
      () => ({
        name: '__test2',
        prop2: 'some other value',
        type: 'unused',
      }),
    ];

    const registry = new Registry();
    registry.register(elements[0]);
    registry.register(elements[1]);

    validateRegistry(registry, elements);

    it('has a prop of name', () => {
      expect(registry.getProp()).to.equal('name');
    });

    it('throws when object is missing the lookup prop', () => {
      const check = () => registry.register(() => ({ hello: 'world' }));
      expect(check).to.throwException(/object with a name property/i);
    });
  });

  describe('type registry', () => {
    const elements = [
      () => ({
        type: '__test1',
        prop1: 'some value',
      }),
      () => ({
        type: '__test2',
        prop2: 'some other value',
        name: 'unused',
      }),
    ];

    const registry = new Registry('type');
    registry.register(elements[0]);
    registry.register(elements[1]);

    validateRegistry(registry, elements);

    it('has a prop of type', () => {
      expect(registry.getProp()).to.equal('type');
    });

    it('throws when object is missing the lookup prop', () => {
      const check = () => registry.register(() => ({ hello: 'world' }));
      expect(check).to.throwException(/object with a type property/i);
    });
  });

  describe('wrapped registry', () => {
    let idx = 0;
    const elements = [
      () => ({
        name: '__test1',
        prop1: 'some value',
      }),
      () => ({
        name: '__test2',
        prop2: 'some other value',
        type: 'unused',
      }),
    ];

    class CustomRegistry extends Registry {
      wrapper(obj) {
        // append custom prop to shallow cloned object, with index as a value
        return {
          ...obj,
          __CUSTOM_PROP__: (idx += 1),
        };
      }
    }

    const registry = new CustomRegistry();
    registry.register(elements[0]);
    registry.register(elements[1]);

    it('contains wrapped elements', () => {
      // test for the custom prop on the returned elements
      expect(registry.get(elements[0]().name)).to.have.property('__CUSTOM_PROP__', 1);
      expect(registry.get(elements[1]().name)).to.have.property('__CUSTOM_PROP__', 2);
    });
  });

  describe('shallow clone full prototype', () => {
    const name = 'test_thing';
    let registry;
    let thing;

    beforeEach(() => {
      registry = new Registry();
      class Base {
        constructor(name) {
          this.name = name;
        }

        baseFunc() {
          return 'base';
        }
      }

      class Thing extends Base {
        doThing() {
          return 'done';
        }
      }

      thing = () => new Thing(name);
      registry.register(thing);
    });

    it('get contains the full prototype', () => {
      expect(thing().baseFunc).to.be.a('function');
      expect(registry.get(name).baseFunc).to.be.a('function');
    });

    it('toJS contains the full prototype', () => {
      const val = registry.toJS();
      expect(val[name].baseFunc).to.be.a('function');
    });
  });

  describe('throws when lookup prop is not a string', () => {
    const check = () => new Registry(2);
    expect(check).to.throwException(e => {
      expect(e.message).to.be('Registry property name must be a string');
    });
  });
});
