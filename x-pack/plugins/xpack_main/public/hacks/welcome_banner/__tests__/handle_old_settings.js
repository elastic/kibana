/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';

import { CONFIG_TELEMETRY } from '../../../../common/constants';
import { handleOldSettings } from '../handle_old_settings';

describe('handle_old_settings', () => {

  it('re-uses old setting and stays opted in', async () => {
    const config = {
      get: sinon.stub(),
      remove: sinon.spy(),
      set: sinon.stub(),
    };

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(true);
    config.set.withArgs(CONFIG_TELEMETRY, true).returns(Promise.resolve(true));

    expect(await handleOldSettings(config)).to.be(false);

    expect(config.get.calledOnce).to.be(true);
    expect(config.set.calledOnce).to.be(true);
    expect(config.set.getCall(0).args).to.eql([ CONFIG_TELEMETRY, true ]);
    expect(config.remove.calledTwice).to.be(true);
    expect(config.remove.getCall(0).args[0]).to.be('xPackMonitoring:allowReport');
    expect(config.remove.getCall(1).args[0]).to.be('xPackMonitoring:showBanner');
  });

  it('re-uses old setting and stays opted out', async () => {
    const config = {
      get: sinon.stub(),
      remove: sinon.spy(),
      set: sinon.stub(),
    };

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(false);
    config.set.withArgs(CONFIG_TELEMETRY, false).returns(Promise.resolve(true));

    expect(await handleOldSettings(config)).to.be(false);

    expect(config.get.calledOnce).to.be(true);
    expect(config.set.calledOnce).to.be(true);
    expect(config.set.getCall(0).args).to.eql([ CONFIG_TELEMETRY, false ]);
    expect(config.remove.calledTwice).to.be(true);
    expect(config.remove.getCall(0).args[0]).to.be('xPackMonitoring:allowReport');
    expect(config.remove.getCall(1).args[0]).to.be('xPackMonitoring:showBanner');
  });

  it('re-uses old setting and stays opted out', async () => {
    const config = {
      get: sinon.stub(),
      remove: sinon.spy(),
      set: sinon.stub(),
    };

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(false);
    config.set.withArgs(CONFIG_TELEMETRY, false).returns(Promise.resolve(true));

    expect(await handleOldSettings(config)).to.be(false);

    expect(config.get.calledOnce).to.be(true);
    expect(config.set.calledOnce).to.be(true);
    expect(config.set.getCall(0).args).to.eql([ CONFIG_TELEMETRY, false ]);
    expect(config.remove.calledTwice).to.be(true);
    expect(config.remove.getCall(0).args[0]).to.be('xPackMonitoring:allowReport');
    expect(config.remove.getCall(1).args[0]).to.be('xPackMonitoring:showBanner');
  });

  it('acknowledges users old setting even if re-setting fails', async () => {
    const config = {
      get: sinon.stub(),
      set: sinon.stub(),
    };

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(false);
    config.set.withArgs(CONFIG_TELEMETRY, false).returns(Promise.resolve(false));

    // note: because it doesn't remove the old settings _and_ returns false, there's no risk of suddenly being opted in
    expect(await handleOldSettings(config)).to.be(false);

    expect(config.get.calledOnce).to.be(true);
    expect(config.set.calledOnce).to.be(true);
    expect(config.set.getCall(0).args).to.eql([ CONFIG_TELEMETRY, false ]);
  });

  it('removes show banner setting and presents user with choice', async () => {
    const config = {
      get: sinon.stub(),
      remove: sinon.spy(),
    };

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(null);
    config.get.withArgs('xPackMonitoring:showBanner', null).returns(false);

    expect(await handleOldSettings(config)).to.be(true);

    expect(config.get.calledTwice).to.be(true);
    expect(config.remove.calledOnce).to.be(true);
    expect(config.remove.getCall(0).args[0]).to.be('xPackMonitoring:showBanner');
  });

  it('is effectively ignored on fresh installs', async () => {
    const config = {
      get: sinon.stub(),
    };

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(null);
    config.get.withArgs('xPackMonitoring:showBanner', null).returns(null);

    expect(await handleOldSettings(config)).to.be(true);

    expect(config.get.calledTwice).to.be(true);
  });

});