/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash';
import expect from '@kbn/expect';
import sinon from 'sinon';
import proxyquire from 'proxyquire';
import { COMPARATORS, SORT_ORDERS } from '../../../../common/constants';

const constructorMock = sinon.stub();
const upstreamJsonMock = sinon.stub();
const downstreamJsonMock = sinon.stub();
const getPropsFromUpstreamJsonMock = sinon.stub();
const getPropsFromDownstreamJsonMock = sinon.stub();
const buildTriggerMock = sinon.stub();
const buildInputMock = sinon.stub();
const buildConditionMock = sinon.stub();
const buildTransformMock = sinon.stub();
const buildActionsMock = sinon.stub();
const buildMetadataMock = sinon.stub();
const buildVisualizeQueryMock = sinon.stub();
const formatVisualizeDataMock = sinon.stub();
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

const { ThresholdWatch } = proxyquire('../threshold_watch/threshold_watch', {
  '../base_watch': { BaseWatch: BaseWatchStub },
  './build_actions': {
    buildActions: (...args) => {
      buildActionsMock(...args);
      return 'buildActionsResult';
    }
  },
  './build_condition': {
    buildCondition: (...args) => {
      buildConditionMock(...args);
      return 'buildConditionResult';
    }
  },
  './build_input': {
    buildInput: (...args) => {
      buildInputMock(...args);
      return 'buildInputResult';
    }
  },
  './build_metadata': {
    buildMetadata: (...args) => {
      buildMetadataMock(...args);
      return 'buildMetadataResult';
    }
  },
  './build_transform': {
    buildTransform: (...args) => {
      buildTransformMock(...args);
      return 'buildTransformResult';
    }
  },
  './build_trigger': {
    buildTrigger: (...args) => {
      buildTriggerMock(...args);
      return 'buildTriggerResult';
    }
  },
  './build_visualize_query': {
    buildVisualizeQuery: (...args) => {
      buildVisualizeQueryMock(...args);
    }
  },
  './format_visualize_data': {
    formatVisualizeData: (...args) => {
      formatVisualizeDataMock(...args);
    }
  }
});

describe('ThresholdWatch', () => {

  describe('Constructor', () => {

    let props;
    beforeEach(() => {
      constructorMock.resetHistory();

      props = {
        index: 'index',
        timeField: 'timeField',
        triggerIntervalSize: 'triggerIntervalSize',
        triggerIntervalUnit: 'triggerIntervalUnit',
        aggType: 'aggType',
        aggField: 'aggField',
        termSize: 'termSize',
        termField: 'termField',
        thresholdComparator: 'thresholdComparator',
        timeWindowSize: 'timeWindowSize',
        timeWindowUnit: 'timeWindowUnit',
        threshold: 'threshold'
      };
    });

    it('should call the BaseWatch constructor', () => {
      new ThresholdWatch(props);
      expect(constructorMock.called).to.be(true);
    });

    it('should populate all expected fields', () => {
      const actual = new ThresholdWatch(props);
      const expected = {
        index: 'index',
        timeField: 'timeField',
        triggerIntervalSize: 'triggerIntervalSize',
        triggerIntervalUnit: 'triggerIntervalUnit',
        aggType: 'aggType',
        aggField: 'aggField',
        termSize: 'termSize',
        termField: 'termField',
        thresholdComparator: 'thresholdComparator',
        timeWindowSize: 'timeWindowSize',
        timeWindowUnit: 'timeWindowUnit',
        threshold: 'threshold'
      };

      expect(actual).to.eql(expected);
    });

  });

  describe('hasTermAgg getter method', () => {

    it('should return true if termField is defined', () => {
      const downstreamJson = { termField: 'foobar' };
      const thresholdWatch = ThresholdWatch.fromDownstreamJson(downstreamJson);

      expect(thresholdWatch.hasTermsAgg).to.be(true);
    });

    it('should return false if termField is undefined', () => {
      const downstreamJson = { termField: undefined };
      const thresholdWatch = ThresholdWatch.fromDownstreamJson(downstreamJson);

      expect(thresholdWatch.hasTermsAgg).to.be(false);
    });

  });

  describe('termOrder getter method', () => {

    it('should return SORT_ORDERS.DESCENDING if thresholdComparator is COMPARATORS.GREATER_THAN', () => {
      const downstreamJson = { thresholdComparator: COMPARATORS.GREATER_THAN };
      const thresholdWatch = ThresholdWatch.fromDownstreamJson(downstreamJson);

      expect(thresholdWatch.termOrder).to.be(SORT_ORDERS.DESCENDING);
    });

    it('should return SORT_ORDERS.ASCENDING if thresholdComparator is not COMPARATORS.GREATER_THAN', () => {
      const downstreamJson = { thresholdComparator: 'foo' };
      const thresholdWatch = ThresholdWatch.fromDownstreamJson(downstreamJson);

      expect(thresholdWatch.termOrder).to.be(SORT_ORDERS.ASCENDING);
    });

  });

  describe('watchJson getter method', () => {

    beforeEach(() => {
      buildActionsMock.resetHistory();
      buildConditionMock.resetHistory();
      buildInputMock.resetHistory();
      buildMetadataMock.resetHistory();
      buildTransformMock.resetHistory();
      buildTriggerMock.resetHistory();
    });

    it('should return the correct result', () => {
      const watch = new ThresholdWatch({});
      const actual = watch.watchJson;
      const expected = {
        trigger: 'buildTriggerResult',
        input: 'buildInputResult',
        condition: 'buildConditionResult',
        transform: 'buildTransformResult',
        actions: 'buildActionsResult',
        metadata: 'buildMetadataResult'
      };

      expect(actual).to.eql(expected);
      expect(buildActionsMock.calledWith(watch)).to.be(true);
      expect(buildConditionMock.calledWith(watch)).to.be(true);
      expect(buildInputMock.calledWith(watch)).to.be(true);
      expect(buildMetadataMock.calledWith(watch)).to.be(true);
      expect(buildTransformMock.calledWith(watch)).to.be(true);
      expect(buildTriggerMock.calledWith(watch)).to.be(true);
    });

  });

  describe('getVisualizeQuery method', () => {

    beforeEach(() => {
      buildVisualizeQueryMock.resetHistory();
    });

    it('should call the external buildVisualizeQuery method', () => {
      const watch = new ThresholdWatch({});
      const options = { foo: 'bar' };
      watch.getVisualizeQuery(options);

      expect(buildVisualizeQueryMock.calledWith(watch, options)).to.be(true);
    });

  });

  describe('formatVisualizeData method', () => {

    beforeEach(() => {
      formatVisualizeDataMock.resetHistory();
    });

    it('should call the external formatVisualizeData method', () => {
      const watch = new ThresholdWatch({});
      const results = { foo: 'bar' };
      watch.formatVisualizeData(results);

      expect(formatVisualizeDataMock.calledWith(watch, results)).to.be(true);
    });

  });

  describe('upstreamJson getter method', () => {

    let props;
    beforeEach(() => {
      upstreamJsonMock.resetHistory();

      props = {
        index: 'index',
        timeField: 'timeField',
        triggerIntervalSize: 'triggerIntervalSize',
        triggerIntervalUnit: 'triggerIntervalUnit',
        aggType: 'aggType',
        aggField: 'aggField',
        termSize: 'termSize',
        termField: 'termField',
        thresholdComparator: 'thresholdComparator',
        timeWindowSize: 'timeWindowSize',
        timeWindowUnit: 'timeWindowUnit',
        threshold: 'threshold'
      };
    });

    it('should call the getter from WatchBase and return the correct result', () => {
      const watch = new ThresholdWatch(props);
      const actual = watch.upstreamJson;
      const expected = { baseCalled: true };

      expect(upstreamJsonMock.called).to.be(true);
      expect(actual).to.eql(expected);
    });

  });

  describe('downstreamJson getter method', () => {

    let props;
    beforeEach(() => {
      downstreamJsonMock.resetHistory();

      props = {
        index: 'index',
        timeField: 'timeField',
        triggerIntervalSize: 'triggerIntervalSize',
        triggerIntervalUnit: 'triggerIntervalUnit',
        aggType: 'aggType',
        aggField: 'aggField',
        termSize: 'termSize',
        termField: 'termField',
        thresholdComparator: 'thresholdComparator',
        timeWindowSize: 'timeWindowSize',
        timeWindowUnit: 'timeWindowUnit',
        threshold: 'threshold'
      };
    });

    it('should call the getter from WatchBase and return the correct result', () => {
      const watch = new ThresholdWatch(props);
      const actual = watch.downstreamJson;
      const expected = {
        baseCalled: true,
        index: 'index',
        timeField: 'timeField',
        triggerIntervalSize: 'triggerIntervalSize',
        triggerIntervalUnit: 'triggerIntervalUnit',
        aggType: 'aggType',
        aggField: 'aggField',
        termSize: 'termSize',
        termField: 'termField',
        thresholdComparator: 'thresholdComparator',
        timeWindowSize: 'timeWindowSize',
        timeWindowUnit: 'timeWindowUnit',
        threshold: 'threshold'
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
        watchJson: {
          foo: { bar: 'baz' },
          metadata: {
            watcherui: {
              index: 'index',
              time_field: 'timeField',
              trigger_interval_size: 'triggerIntervalSize',
              trigger_interval_unit: 'triggerIntervalUnit',
              agg_type: 'aggType',
              agg_field: 'aggField',
              term_size: 'termSize',
              term_field: 'termField',
              threshold_comparator: 'thresholdComparator',
              time_window_size: 'timeWindowSize',
              time_window_unit: 'timeWindowUnit',
              threshold: 'threshold'
            }
          }
        }
      };
    });

    it('should call the getPropsFromUpstreamJson method of BaseWatch', () => {
      ThresholdWatch.fromUpstreamJson(upstreamJson);

      expect(getPropsFromUpstreamJsonMock.called).to.be(true);
    });

    it('should generate a valid ThresholdWatch object', () => {
      const actual = ThresholdWatch.fromUpstreamJson(upstreamJson);
      const expected = {
        index: 'index',
        timeField: 'timeField',
        triggerIntervalSize: 'triggerIntervalSize',
        triggerIntervalUnit: 'triggerIntervalUnit',
        aggType: 'aggType',
        aggField: 'aggField',
        termSize: 'termSize',
        termField: 'termField',
        thresholdComparator: 'thresholdComparator',
        timeWindowSize: 'timeWindowSize',
        timeWindowUnit: 'timeWindowUnit',
        threshold: 'threshold'
      };

      expect(actual).to.eql(expected);
    });

  });

  describe('fromDownstreamJson factory method', () => {

    let downstreamJson;
    beforeEach(() => {
      getPropsFromDownstreamJsonMock.resetHistory();

      downstreamJson = {
        index: 'index',
        timeField: 'timeField',
        triggerIntervalSize: 'triggerIntervalSize',
        triggerIntervalUnit: 'triggerIntervalUnit',
        aggType: 'aggType',
        aggField: 'aggField',
        termSize: 'termSize',
        termField: 'termField',
        thresholdComparator: 'thresholdComparator',
        timeWindowSize: 'timeWindowSize',
        timeWindowUnit: 'timeWindowUnit',
        threshold: 'threshold'
      };
    });

    it('should call the getPropsFromDownstreamJson method of BaseWatch', () => {
      ThresholdWatch.fromDownstreamJson(downstreamJson);

      expect(getPropsFromDownstreamJsonMock.called).to.be(true);
    });

    it('should generate a valid ThresholdWatch object', () => {
      const actual = ThresholdWatch.fromDownstreamJson(downstreamJson);
      const expected = {
        index: 'index',
        timeField: 'timeField',
        triggerIntervalSize: 'triggerIntervalSize',
        triggerIntervalUnit: 'triggerIntervalUnit',
        aggType: 'aggType',
        aggField: 'aggField',
        termSize: 'termSize',
        termField: 'termField',
        thresholdComparator: 'thresholdComparator',
        timeWindowSize: 'timeWindowSize',
        timeWindowUnit: 'timeWindowUnit',
        threshold: 'threshold'
      };

      expect(actual).to.eql(expected);
    });

  });

});
