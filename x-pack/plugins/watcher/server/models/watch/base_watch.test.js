/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseWatch } from './base_watch';

describe('BaseWatch', () => {
  describe('Constructor', () => {
    let props;
    beforeEach(() => {
      props = {
        id: 'my-watch',
        name: 'foo',
        type: 'logging',
      };
    });

    it('should return a valid object', () => {
      const watch = new BaseWatch(props);
      const actual = Object.keys(watch);
      const expected = [
        'id',
        'name',
        'type',
        'isSystemWatch',
        'watchStatus',
        'watchErrors',
        'actions',
      ];

      expect(actual).toEqual(expected);
    });

    it('should default isSystemWatch to false', () => {
      const watch = new BaseWatch(props);

      expect(watch.isSystemWatch).toBe(false);
    });

    it('populates all expected fields', () => {
      props.watchStatus = 'bar';
      props.actions = 'baz';
      props.watchErrors = { actions: 'email' };

      const actual = new BaseWatch(props);
      const expected = {
        id: 'my-watch',
        name: 'foo',
        type: 'logging',
        isSystemWatch: false,
        watchStatus: 'bar',
        watchErrors: { actions: 'email' },
        actions: 'baz',
      };

      expect(actual).toEqual(expected);
    });
  });

  describe('watchJson getter method', () => {
    let props;
    beforeEach(() => {
      props = {
        id: 'my-watch',
        name: 'foo',
        type: 'logging',
      };
    });

    it('should return the expected object', () => {
      const watch = new BaseWatch(props);
      const actual = watch.watchJson;
      const expected = {
        metadata: {
          name: 'foo',
          xpack: {
            type: 'logging',
          },
        },
      };

      expect(actual).toEqual(expected);
    });

    it('should only populate the name metadata if a name is defined', () => {
      delete props.name;
      const watch = new BaseWatch(props);
      const actual = watch.watchJson;
      const expected = {
        metadata: {
          xpack: {
            type: props.type,
          },
        },
      };

      expect(actual).toEqual(expected);
    });
  });

  describe('getVisualizeQuery getter method', () => {
    it('should return an empty object', () => {
      const watch = new BaseWatch({});
      const actual = watch.getVisualizeQuery();
      const expected = {};

      expect(actual).toEqual(expected);
    });
  });

  describe('formatVisualizeData getter method', () => {
    it('should return an empty array', () => {
      const watch = new BaseWatch({});
      const actual = watch.formatVisualizeData();
      const expected = [];

      expect(actual).toEqual(expected);
    });
  });

  describe('downstreamJson getter method', () => {
    let props;
    beforeEach(() => {
      props = {
        id: 'foo',
        name: 'bar',
        type: 'json',
        watchStatus: {
          downstreamJson: {
            prop1: 'prop1',
            prop2: 'prop2',
          },
        },
        watchErrors: {
          downstreamJson: {
            prop1: 'prop1',
            prop2: 'prop2',
          },
        },
        actions: [
          {
            downstreamJson: {
              prop1: 'prop3',
              prop2: 'prop4',
            },
          },
        ],
      };
    });

    it('should return a valid object', () => {
      const watch = new BaseWatch(props);

      const actual = watch.downstreamJson;
      const expected = {
        id: props.id,
        name: props.name,
        type: props.type,
        isSystemWatch: false,
        watchStatus: props.watchStatus.downstreamJson,
        watchErrors: props.watchErrors.downstreamJson,
        actions: props.actions.map(a => a.downstreamJson),
      };

      expect(actual).toEqual(expected);
    });

    it('should respect an undefined watchStatus & watchErrors prop', () => {
      delete props.watchStatus;
      delete props.watchErrors;

      const watch = new BaseWatch(props);
      const actual = watch.downstreamJson;

      const expected = {
        id: props.id,
        name: props.name,
        type: props.type,
        isSystemWatch: false,
        watchStatus: undefined,
        watchErrors: undefined,
        actions: props.actions.map(a => a.downstreamJson),
      };

      expect(actual).toEqual(expected);
    });
  });

  describe('getPropsFromDownstreamJson method', () => {
    let downstreamJson;
    beforeEach(() => {
      downstreamJson = {
        id: 'my-watch',
        name: 'foo',
        actions: [],
      };
    });

    it('should return a valid props object', () => {
      const props = BaseWatch.getPropsFromDownstreamJson(downstreamJson);
      const actual = Object.keys(props);
      const expected = ['id', 'name', 'actions'];

      expect(actual).toEqual(expected);
    });

    it('should properly map id and name', () => {
      const props = BaseWatch.getPropsFromDownstreamJson(downstreamJson);
      expect(props.id).toBe('my-watch');
      expect(props.name).toBe('foo');
    });

    it('should return an actions property that is an array', () => {
      const props = BaseWatch.getPropsFromDownstreamJson(downstreamJson);

      expect(Array.isArray(props.actions)).toBe(true);
      expect(props.actions.length).toBe(0);
    });
  });

  describe('getPropsFromUpstreamJson method', () => {
    let upstreamJson;
    beforeEach(() => {
      upstreamJson = {
        id: 'my-watch',
        type: 'json',
        watchJson: {
          metadata: {
            name: 'foo',
          },
          condition: {
            never: {},
          },
        },
        watchStatusJson: {
          state: {
            active: true,
          },
        },
      };
    });

    it(`throws an error if no 'id' property in json`, () => {
      delete upstreamJson.id;

      expect(() => {
        BaseWatch.getPropsFromUpstreamJson(upstreamJson);
      }).toThrow(/must contain an id property/i);
    });

    it(`throws an error if no 'watchJson' property in json`, () => {
      delete upstreamJson.watchJson;

      expect(() => {
        BaseWatch.getPropsFromUpstreamJson(upstreamJson);
      }).toThrow(/must contain a watchJson property/i);
    });

    it(`throws an error if no 'watchStatusJson' property in json`, () => {
      delete upstreamJson.watchStatusJson;

      expect(() => {
        BaseWatch.getPropsFromUpstreamJson(upstreamJson);
      }).toThrow(/must contain a watchStatusJson property/i);
    });

    it(`should ignore unknown watchJson properties`, () => {
      upstreamJson.watchJson = {
        foo: 'foo',
        bar: 'bar',
        trigger: {},
        input: {},
        condition: {},
        actions: {},
        metadata: {},
        transform: {},
        throttle_period: {},
        throttle_period_in_millis: {},
      };

      const props = BaseWatch.getPropsFromUpstreamJson(upstreamJson);
      const actual = Object.keys(props.watchJson);
      const expected = [
        'trigger',
        'input',
        'condition',
        'actions',
        'metadata',
        'transform',
        'throttle_period',
        'throttle_period_in_millis',
      ];

      expect(actual).toEqual(expected);
    });

    it('should return a valid props object', () => {
      const props = BaseWatch.getPropsFromUpstreamJson(upstreamJson);
      const actual = Object.keys(props);
      const expected = ['id', 'name', 'watchJson', 'watchStatus', 'watchErrors', 'actions'];

      expect(actual).toEqual(expected);
    });

    it('should pull name out of metadata', () => {
      const props = BaseWatch.getPropsFromUpstreamJson(upstreamJson);

      expect(props.name).toBe('foo');
    });

    it('should return an actions property that is an array', () => {
      const props = BaseWatch.getPropsFromUpstreamJson(upstreamJson);

      expect(Array.isArray(props.actions)).toBe(true);
      expect(props.actions.length).toBe(0);
    });
  });
});
