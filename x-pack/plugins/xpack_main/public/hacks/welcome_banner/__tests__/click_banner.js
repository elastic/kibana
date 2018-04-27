/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';

import { CONFIG_TELEMETRY } from '../../../../common/constants';
import {
  clickBanner,
} from '../click_banner';

describe('click_banner', () => {

  it('sets setting successfuly and removes banner', async () => {
    const banners = {
      remove: sinon.spy()
    };
    const config = {
      set: sinon.stub()
    };
    const bannerId = 'bruce-banner';
    const optIn = true;

    config.set.withArgs(CONFIG_TELEMETRY, true).returns(Promise.resolve(true));

    await clickBanner(bannerId, config, optIn, { _banners: banners });

    expect(config.set.calledOnce).to.be(true);
    expect(banners.remove.calledOnce).to.be(true);
    expect(banners.remove.calledWith(bannerId)).to.be(true);
  });

  it('sets setting unsuccessfuly, adds toast, and does not touch banner', async () => {
    const toastNotifications = {
      addDanger: sinon.spy()
    };
    const banners = {
      remove: sinon.spy()
    };
    const config = {
      set: sinon.stub()
    };
    const bannerId = 'bruce-banner';
    const optIn = true;

    config.set.withArgs(CONFIG_TELEMETRY, true).returns(Promise.resolve(false));

    await clickBanner(bannerId, config, optIn, { _banners: banners, _toastNotifications: toastNotifications });

    expect(config.set.calledOnce).to.be(true);
    expect(toastNotifications.addDanger.calledOnce).to.be(true);
    expect(banners.remove.notCalled).to.be(true);
  });

  it('sets setting unsuccessfuly with error, adds toast, and does not touch banner', async () => {
    const toastNotifications = {
      addDanger: sinon.spy()
    };
    const banners = {
      remove: sinon.spy()
    };
    const config = {
      set: sinon.stub()
    };
    const bannerId = 'bruce-banner';
    const optIn = false;

    config.set.withArgs(CONFIG_TELEMETRY, false).returns(Promise.reject());

    await clickBanner(bannerId, config, optIn, { _banners: banners, _toastNotifications: toastNotifications });

    expect(config.set.calledOnce).to.be(true);
    expect(toastNotifications.addDanger.calledOnce).to.be(true);
    expect(banners.remove.notCalled).to.be(true);
  });

});