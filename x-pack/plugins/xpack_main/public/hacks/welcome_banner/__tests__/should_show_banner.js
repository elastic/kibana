/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';

import { CONFIG_TELEMETRY } from '../../../../common/constants';
import { shouldShowBanner } from '../should_show_banner';

describe('should_show_banner', () => {

  it('returns whatever handleOldSettings does when telemetry opt-in setting is unset', async () => {
    const config = { get: sinon.stub() };
    const handleOldSettingsTrue = sinon.stub();
    const handleOldSettingsFalse = sinon.stub();

    config.get.withArgs(CONFIG_TELEMETRY, null).returns(null);
    handleOldSettingsTrue.returns(Promise.resolve(true));
    handleOldSettingsFalse.returns(Promise.resolve(false));

    const showBannerTrue = await shouldShowBanner(config, { _handleOldSettings: handleOldSettingsTrue });
    const showBannerFalse = await shouldShowBanner(config, { _handleOldSettings: handleOldSettingsFalse });

    expect(showBannerTrue).to.be(true);
    expect(showBannerFalse).to.be(false);

    expect(config.get.calledTwice).to.be(true);
    expect(handleOldSettingsTrue.calledOnce).to.be(true);
    expect(handleOldSettingsFalse.calledOnce).to.be(true);
  });

  it('returns false if telemetry opt-in setting is set to true', async () => {
    const config = { get: sinon.stub() };

    config.get.withArgs(CONFIG_TELEMETRY, null).returns(true);

    expect(await shouldShowBanner(config)).to.be(false);
  });

  it('returns false if telemetry opt-in setting is set to false', async () => {
    const config = { get: sinon.stub() };

    config.get.withArgs(CONFIG_TELEMETRY, null).returns(false);

    expect(await shouldShowBanner(config)).to.be(false);
  });

});