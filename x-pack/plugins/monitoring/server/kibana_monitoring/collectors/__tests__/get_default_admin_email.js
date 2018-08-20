/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';
import { set } from 'lodash';

import { XPACK_DEFAULT_ADMIN_EMAIL_UI_SETTING } from '../../../../../../server/lib/constants';
import { getDefaultAdminEmail } from '../get_settings_collector';
import { CLUSTER_ALERTS_ADDRESS_CONFIG_KEY } from '../../../lib/constants';

describe('getSettingsCollector / getDefaultAdminEmail', () => {
  function setup({ enabled = true, docExists = true, defaultAdminEmail = 'default-admin@email.com', adminEmail = null }) {
    const config = { get: sinon.stub() };

    config.get
      .withArgs('xpack.monitoring.cluster_alerts.email_notifications.enabled')
      .returns(enabled);

    if (adminEmail) {
      config.get
        .withArgs(`xpack.monitoring.${CLUSTER_ALERTS_ADDRESS_CONFIG_KEY}`)
        .returns(adminEmail);
    }

    config.get
      .withArgs('kibana.index')
      .returns('.kibana');

    config.get
      .withArgs('pkg.version')
      .returns('1.1.1');

    const doc = {};
    if (docExists) {
      if (defaultAdminEmail) {
        set(doc, ['_source', 'config', XPACK_DEFAULT_ADMIN_EMAIL_UI_SETTING], defaultAdminEmail);
      } else {
        set(doc, '_source.config', {});
      }
    } else {
      doc.found = false;
    }

    const callCluster = sinon.stub()
      .withArgs('get', sinon.match({
        index: '.kibana',
        type: 'doc',
        id: 'config:1.1.1'
      }))
      .returns(doc);

    return {
      config,
      callCluster
    };
  }

  describe('using xpack:defaultAdminEmail', () => {
    describe('xpack.monitoring.cluster_alerts.email_notifications.enabled = false', () => {
      it('returns null', async () => {
        const { config, callCluster } = setup({ enabled: false });
        expect(await getDefaultAdminEmail(config, callCluster)).to.be(null);
        sinon.assert.notCalled(callCluster);
      });
    });

    describe('doc does not exist', () => {
      it('returns null', async () => {
        const { config, callCluster } = setup({ docExists: false });
        expect(await getDefaultAdminEmail(config, callCluster)).to.be(null);
        sinon.assert.calledOnce(callCluster);
      });
    });

    describe('value is not defined', () => {
      it('returns null', async () => {
        const { config, callCluster } = setup({ defaultAdminEmail: false });
        expect(await getDefaultAdminEmail(config, callCluster)).to.be(null);
        sinon.assert.calledOnce(callCluster);
      });
    });

    describe('value is defined', () => {
      it('returns value', async () => {
        const { config, callCluster } = setup({ defaultAdminEmail: 'hello@world' });
        expect(await getDefaultAdminEmail(config, callCluster)).to.be('hello@world');
        sinon.assert.calledOnce(callCluster);
      });
    });
  });

  describe('using xpack.monitoring.cluster_alerts.email_notifications.email_address', () => {
    describe('xpack.monitoring.cluster_alerts.email_notifications.enabled = false', () => {
      it('returns null', async () => {
        const { config, callCluster } = setup({ enabled: false });
        expect(await getDefaultAdminEmail(config, callCluster)).to.be(null);
        sinon.assert.notCalled(callCluster);
      });
    });

    describe('value is not defined', () => {
      it('returns value from xpack:defaultAdminEmail', async () => {
        const { config, callCluster } = setup({
          defaultAdminEmail: 'default-admin@email.com',
          adminEmail: false
        });
        expect(await getDefaultAdminEmail(config, callCluster)).to.be('default-admin@email.com');
        sinon.assert.calledOnce(callCluster);
      });
    });

    describe('value is defined', () => {
      it('returns value', async () => {
        const { config, callCluster } = setup({ adminEmail: 'hello@world' });
        expect(await getDefaultAdminEmail(config, callCluster)).to.be('hello@world');
        sinon.assert.notCalled(callCluster);
      });
    });
  });
});
