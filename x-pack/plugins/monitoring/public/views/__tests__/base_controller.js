/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { spy, stub } from 'sinon';
import expect from 'expect.js';
import { MonitoringViewBaseController } from '../';

/*
 * Mostly copied from base_table_controller test, with modifications
 */
describe('MonitoringViewBaseController', function () {

  let ctrl;
  let $injector;
  let $scope;
  let opts;
  let timefilter;
  let titleService;
  let executorService;

  let isTimeRangeSelectorEnabled;
  let isAutoRefreshSelectorEnabled;

  before(() => {
    timefilter = {
      enableTimeRangeSelector: () => {
        isTimeRangeSelectorEnabled = true;
      },
      enableAutoRefreshSelector: () => {
        isAutoRefreshSelectorEnabled = true;
      },
      disableTimeRangeSelector: () => {
        isTimeRangeSelectorEnabled = false;
      },
      disableAutoRefreshSelector: () => {
        isAutoRefreshSelectorEnabled = false;
      },
    };
    titleService = spy();
    executorService = {
      register: spy(),
      start: spy()
    };

    const injectorGetStub = stub();
    injectorGetStub.withArgs('title').returns(titleService);
    injectorGetStub.withArgs('timefilter').returns(timefilter);
    injectorGetStub.withArgs('$executor').returns(executorService);
    injectorGetStub.withArgs('localStorage').throws('localStorage should not be used by this class');
    $injector = { get: injectorGetStub };

    $scope = {
      cluster: { cluster_uuid: 'foo' },
      $on: stub()
    };

    opts = {
      title: 'testo',
      getPageData: () => Promise.resolve({ data: { test: true } }),
      $injector,
      $scope
    };

    ctrl = new MonitoringViewBaseController(opts);
  });

  it('creates functions for fetching data', () => {
    expect(ctrl.updateData).to.be.a('function');
    expect(ctrl.onBrush).to.be.a('function');
  });


  it('sets page title', () => {
    expect(titleService.calledOnce).to.be(true);
    const { args } = titleService.getCall(0);
    expect(args).to.eql([
      { cluster_uuid: 'foo' },
      'testo'
    ]);
  });

  it('starts data poller', () => {
    expect(executorService.register.calledOnce).to.be(true);
    expect(executorService.start.calledOnce).to.be(true);
  });

  describe('time filter', () => {
    it('enables timepicker and auto refresh #1', () => {
      expect(isTimeRangeSelectorEnabled).to.be(true);
      expect(isAutoRefreshSelectorEnabled).to.be(true);
    });

    it('enables timepicker and auto refresh #2', () => {
      opts = {
        ...opts,
        options: {}
      };
      ctrl = new MonitoringViewBaseController(opts);

      expect(isTimeRangeSelectorEnabled).to.be(true);
      expect(isAutoRefreshSelectorEnabled).to.be(true);
    });

    it('disables timepicker and enables auto refresh', () => {
      opts = {
        ...opts,
        options: { enableTimeFilter: false }
      };
      ctrl = new MonitoringViewBaseController(opts);

      expect(isTimeRangeSelectorEnabled).to.be(false);
      expect(isAutoRefreshSelectorEnabled).to.be(true);
    });

    it('enables timepicker and disables auto refresh', () => {
      opts = {
        ...opts,
        options: { enableAutoRefresh: false }
      };
      ctrl = new MonitoringViewBaseController(opts);

      expect(isTimeRangeSelectorEnabled).to.be(true);
      expect(isAutoRefreshSelectorEnabled).to.be(false);
    });

    it('disables timepicker and auto refresh', () => {
      opts = {
        ...opts,
        options: {
          enableTimeFilter: false,
          enableAutoRefresh: false,
        }
      };
      ctrl = new MonitoringViewBaseController(opts);

      expect(isTimeRangeSelectorEnabled).to.be(false);
      expect(isAutoRefreshSelectorEnabled).to.be(false);
    });
  });

});

