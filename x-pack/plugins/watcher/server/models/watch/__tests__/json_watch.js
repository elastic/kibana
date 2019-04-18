/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash';
import expect from '@kbn/expect';
import sinon from 'sinon';
import proxyquire from 'proxyquire';

const constructorMock = sinon.stub();
const upstreamJsonMock = sinon.stub();
const downstreamJsonMock = sinon.stub();
const getPropsFromUpstreamJsonMock = sinon.stub();
const getPropsFromDownstreamJsonMock = sinon.stub();
class BaseWatchStub {
  constructor(props) {
    constructorMock(props);
  }

  get upstreamJson() {
    upstreamJsonMock();

    return {
      baseCalled: true
    };
  }

  get downstreamJson() {
    downstreamJsonMock();

    return {
      baseCalled: true
    };
  }

  static getPropsFromUpstreamJson(json) {
    getPropsFromUpstreamJsonMock();
    return pick(json, 'watchJson');
  }

  static getPropsFromDownstreamJson(json) {
    getPropsFromDownstreamJsonMock();
    return pick(json, 'watchJson');
  }
}

const { JsonWatch } = proxyquire('../json_watch', {
  './base_watch': { BaseWatch: BaseWatchStub }
});

describe('JsonWatch', () => {

  describe('Constructor', () => {

    let props;
    beforeEach(() => {
      constructorMock.resetHistory();

      props = {
        watch: 'foo'
      };
    });

    it('should call the BaseWatch constructor', () => {
      new JsonWatch(props);
      expect(constructorMock.called).to.be(true);
    });

    it('should populate all expected fields', () => {
      const actual = new JsonWatch(props);
      const expected = {
        watch: 'foo'
      };

      expect(actual).to.eql(expected);
    });

  });

  describe('watchJson getter method', () => {

    let props;
    beforeEach(() => {
      props = {
        watch: { foo: 'bar' }
      };
    });

    it('should return the correct result', () => {
      const watch = new JsonWatch(props);

      expect(watch.watchJson).to.eql(props.watch);
    });

  });

  describe('upstreamJson getter method', () => {

    beforeEach(() => {
      upstreamJsonMock.resetHistory();
    });

    it('should call the getter from WatchBase and return the correct result', () => {
      const watch = new JsonWatch({ watch: 'foo' });
      const actual = watch.upstreamJson;
      const expected = {
        baseCalled: true
      };

      expect(upstreamJsonMock.called).to.be(true);
      expect(actual).to.eql(expected);
    });

  });

  describe('downstreamJson getter method', () => {

    let props;
    beforeEach(() => {
      downstreamJsonMock.resetHistory();

      props = {
        watch: 'foo',
        watchJson: 'bar'
      };
    });

    it('should call the getter from WatchBase and return the correct result', () => {
      const watch = new JsonWatch(props);
      const actual = watch.downstreamJson;
      const expected = {
        baseCalled: true,
        watch: 'foo'
      };

      expect(downstreamJsonMock.called).to.be(true);
      expect(actual).to.eql(expected);
    });

  });

  describe('fromUpstreamJson factory method', () => {

    let upstreamJson;
    beforeEach(() => {
      getPropsFromUpstreamJsonMock.resetHistory();

      upstreamJson = {
        watchJson: { foo: { bar: 'baz' } }
      };
    });

    it('should call the getPropsFromUpstreamJson method of BaseWatch', () => {
      JsonWatch.fromUpstreamJson(upstreamJson);

      expect(getPropsFromUpstreamJsonMock.called).to.be(true);
    });

    it('should clone the watchJson property into a watch property', () => {
      const jsonWatch = JsonWatch.fromUpstreamJson(upstreamJson);

      expect(jsonWatch.watch).to.eql(upstreamJson.watchJson);
      expect(jsonWatch.watch).to.not.be(upstreamJson.watchJson);
    });

    it('should remove the metadata.name property from the watch property', () => {
      upstreamJson.watchJson.metadata = { name: 'foobar', foo: 'bar' };

      const jsonWatch = JsonWatch.fromUpstreamJson(upstreamJson);

      expect(jsonWatch.watch.metadata.name).to.be(undefined);
    });

    it('should remove the metadata.xpack property from the watch property', () => {
      upstreamJson.watchJson.metadata = {
        name: 'foobar',
        xpack: { prop: 'val' },
        foo: 'bar'
      };

      const jsonWatch = JsonWatch.fromUpstreamJson(upstreamJson);

      expect(jsonWatch.watch.metadata.xpack).to.be(undefined);
    });

    it('should remove an empty metadata property from the watch property', () => {
      upstreamJson.watchJson.metadata = { name: 'foobar' };

      const jsonWatch = JsonWatch.fromUpstreamJson(upstreamJson);

      expect(jsonWatch.watch.metadata).to.be(undefined);
    });

  });

  describe('fromDownstreamJson factory method', () => {

    let downstreamJson;
    beforeEach(() => {
      getPropsFromDownstreamJsonMock.resetHistory();

      downstreamJson = {
        watch: { foo: { bar: 'baz' } }
      };
    });

    it('should call the getPropsFromDownstreamJson method of BaseWatch', () => {
      JsonWatch.fromDownstreamJson(downstreamJson);

      expect(getPropsFromDownstreamJsonMock.called).to.be(true);
    });

    it('should copy the watch property', () => {
      const jsonWatch = JsonWatch.fromDownstreamJson(downstreamJson);

      expect(jsonWatch.watch).to.eql(downstreamJson.watch);
    });

  });

});
