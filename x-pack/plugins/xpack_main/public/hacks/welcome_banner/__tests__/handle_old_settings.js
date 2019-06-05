/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';

import { CONFIG_TELEMETRY } from '../../../../common/constants';
import { handleOldSettings } from '../handle_old_settings';
import { TelemetryOptInProvider } from '../../../services/telemetry_opt_in';

const getTelemetryOptInProvider = (enabled, { simulateFailure = false } = {}) => {
  const $http = {
    post: async () => {
      if (simulateFailure) {
        return Promise.reject(new Error('something happened'));
      }
      return {};
    }
  };

  const chrome = {
    addBasePath: url => url
  };

  const $injector = {
    get: (key) => {
      if (key === '$http') {
        return $http;
      }
      if (key === 'telemetryOptedIn') {
        return enabled;
      }
      throw new Error(`unexpected mock injector usage for ${key}`);
    }
  };

  return new TelemetryOptInProvider($injector, chrome);
};

describe('handle_old_settings', () => {

  it('re-uses old "allowReport" setting and stays opted in', async () => {
    const config = {
      get: sinon.stub(),
      remove: sinon.spy(),
      set: sinon.stub(),
    };

    const telemetryOptInProvider = getTelemetryOptInProvider(null);
    expect(telemetryOptInProvider.getOptIn()).to.be(null);

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(true);
    config.set.withArgs(CONFIG_TELEMETRY, true).returns(Promise.resolve(true));

    expect(await handleOldSettings(config, telemetryOptInProvider)).to.be(false);

    expect(config.get.calledTwice).to.be(true);
    expect(config.set.called).to.be(false);

    expect(config.remove.calledThrice).to.be(true);
    expect(config.remove.getCall(0).args[0]).to.be('xPackMonitoring:allowReport');
    expect(config.remove.getCall(1).args[0]).to.be('xPackMonitoring:showBanner');
    expect(config.remove.getCall(2).args[0]).to.be(CONFIG_TELEMETRY);

    expect(telemetryOptInProvider.getOptIn()).to.be(true);
  });

  it('re-uses old "telemetry:optIn" setting and stays opted in', async () => {
    const config = {
      get: sinon.stub(),
      remove: sinon.spy(),
      set: sinon.stub(),
    };

    const telemetryOptInProvider = getTelemetryOptInProvider(null);
    expect(telemetryOptInProvider.getOptIn()).to.be(null);

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(false);
    config.get.withArgs(CONFIG_TELEMETRY, null).returns(true);

    expect(await handleOldSettings(config, telemetryOptInProvider)).to.be(false);

    expect(config.get.calledTwice).to.be(true);
    expect(config.set.called).to.be(false);

    expect(config.remove.calledThrice).to.be(true);
    expect(config.remove.getCall(0).args[0]).to.be('xPackMonitoring:allowReport');
    expect(config.remove.getCall(1).args[0]).to.be('xPackMonitoring:showBanner');
    expect(config.remove.getCall(2).args[0]).to.be(CONFIG_TELEMETRY);

    expect(telemetryOptInProvider.getOptIn()).to.be(true);
  });

  it('re-uses old "allowReport" setting and stays opted out', async () => {
    const config = {
      get: sinon.stub(),
      remove: sinon.spy(),
      set: sinon.stub(),
    };

    const telemetryOptInProvider = getTelemetryOptInProvider(null);
    expect(telemetryOptInProvider.getOptIn()).to.be(null);

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(false);
    config.set.withArgs(CONFIG_TELEMETRY, false).returns(Promise.resolve(true));

    expect(await handleOldSettings(config, telemetryOptInProvider)).to.be(false);

    expect(config.get.calledTwice).to.be(true);
    expect(config.set.called).to.be(false);
    expect(config.remove.calledThrice).to.be(true);
    expect(config.remove.getCall(0).args[0]).to.be('xPackMonitoring:allowReport');
    expect(config.remove.getCall(1).args[0]).to.be('xPackMonitoring:showBanner');
    expect(config.remove.getCall(2).args[0]).to.be(CONFIG_TELEMETRY);

    expect(telemetryOptInProvider.getOptIn()).to.be(false);
  });

  it('re-uses old "telemetry:optIn" setting and stays opted out', async () => {
    const config = {
      get: sinon.stub(),
      remove: sinon.spy(),
      set: sinon.stub(),
    };

    const telemetryOptInProvider = getTelemetryOptInProvider(null);

    config.get.withArgs(CONFIG_TELEMETRY, null).returns(false);
    config.get.withArgs('xPackMonitoring:allowReport', null).returns(true);

    expect(await handleOldSettings(config, telemetryOptInProvider)).to.be(false);

    expect(config.get.calledTwice).to.be(true);
    expect(config.set.called).to.be(false);
    expect(config.remove.calledThrice).to.be(true);
    expect(config.remove.getCall(0).args[0]).to.be('xPackMonitoring:allowReport');
    expect(config.remove.getCall(1).args[0]).to.be('xPackMonitoring:showBanner');
    expect(config.remove.getCall(2).args[0]).to.be(CONFIG_TELEMETRY);

    expect(telemetryOptInProvider.getOptIn()).to.be(false);
  });

  it('acknowledges users old setting even if re-setting fails', async () => {
    const config = {
      get: sinon.stub(),
      set: sinon.stub(),
    };

    const telemetryOptInProvider = getTelemetryOptInProvider(null, { simulateFailure: true });

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(false);
    //todo: make the new version of this fail!
    config.set.withArgs(CONFIG_TELEMETRY, false).returns(Promise.resolve(false));

    // note: because it doesn't remove the old settings _and_ returns false, there's no risk of suddenly being opted in
    expect(await handleOldSettings(config, telemetryOptInProvider)).to.be(false);

    expect(config.get.calledTwice).to.be(true);
    expect(config.set.called).to.be(false);
  });

  it('removes show banner setting and presents user with choice', async () => {
    const config = {
      get: sinon.stub(),
      remove: sinon.spy(),
    };

    const telemetryOptInProvider = getTelemetryOptInProvider(null);

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(null);
    config.get.withArgs('xPackMonitoring:showBanner', null).returns(false);

    expect(await handleOldSettings(config, telemetryOptInProvider)).to.be(true);

    expect(config.get.calledThrice).to.be(true);
    expect(config.remove.calledOnce).to.be(true);
    expect(config.remove.getCall(0).args[0]).to.be('xPackMonitoring:showBanner');
  });

  it('is effectively ignored on fresh installs', async () => {
    const config = {
      get: sinon.stub(),
    };

    const telemetryOptInProvider = getTelemetryOptInProvider(null);

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(null);
    config.get.withArgs('xPackMonitoring:showBanner', null).returns(null);

    expect(await handleOldSettings(config, telemetryOptInProvider)).to.be(true);

    expect(config.get.calledThrice).to.be(true);
  });

});
