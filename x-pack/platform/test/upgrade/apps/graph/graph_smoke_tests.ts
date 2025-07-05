/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import semver from 'semver';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common, header, home, graph } = getPageObjects(['common', 'header', 'home', 'graph']);
  const log = getService('log');

  describe('upgrade graph smoke tests', function describeIndexTests() {
    before(async function () {
      log.debug(process.env.ORIGINAL_VERSION!);
      if (semver.lt(process.env.ORIGINAL_VERSION!, '7.6.0-SNAPSHOT')) {
        log.debug('Skipping! These tests are valid only for 7.6+ versions');
        this.skip();
      }
    });

    const spaces = [
      { space: 'default', basePath: '' },
      { space: 'automation', basePath: 's/automation' },
    ];

    const graphTests = [
      { name: 'flights', numNodes: 91 },
      { name: 'logs', numNodes: 27 },
      { name: 'ecommerce', numNodes: 12 },
    ];

    spaces.forEach(({ space, basePath }) => {
      graphTests.forEach(({ name, numNodes }) => {
        describe('space: ' + space, () => {
          before(async () => {
            await common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
              basePath,
            });
            await header.waitUntilLoadingHasFinished();
            await home.launchSampleGraph(name);
            await header.waitUntilLoadingHasFinished();
          });
          it('renders graph for ' + name, async () => {
            const elements = await graph.getAllGraphNodes();
            expect(elements).to.be.equal(numNodes);
          });
        });
      });
    });
  });
}
