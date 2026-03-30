/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsArchiver } from '@kbn/es-archiver';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile, getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['timePicker', 'svlCommonPage']);
  const config = getService('config');
  let remoteEsArchiver;

  describe('Visualizations - Group 13 (TSVB Open in Lens - Part 1)', function () {
    this.tags(['esGate']);

    const esArchive = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
    const localIndexPatternString = 'logstash-*';
    const remoteIndexPatternString = 'ftr-remote:logstash-*';
    const localFixtures = {
      lensBasic: 'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json',
      lensDefault: 'x-pack/platform/test/functional/fixtures/kbn_archives/lens/default',
    };

    const remoteFixtures = {
      lensBasic: 'x-pack/platform/test/functional/fixtures/kbn_archives/lens/ccs/lens_basic.json',
      lensDefault: 'x-pack/platform/test/functional/fixtures/kbn_archives/lens/ccs/default',
    };
    let esNode: EsArchiver;
    let fixtureDirs: {
      lensBasic: string;
      lensDefault: string;
    };
    let indexPatternString: string;
    before(async () => {
      await PageObjects.svlCommonPage.loginWithPrivilegedRole();
      log.debug('Starting lens before method');
      await browser.setWindowSize(1280, 1200);
      try {
        config.get('esTestCluster.ccs');
        remoteEsArchiver = getService('remoteEsArchiver' as 'esArchiver');
        esNode = remoteEsArchiver;
        fixtureDirs = remoteFixtures;
        indexPatternString = remoteIndexPatternString;
      } catch (error) {
        esNode = esArchiver;
        fixtureDirs = localFixtures;
        indexPatternString = localIndexPatternString;
      }

      await esNode.load(esArchive);
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update({
        defaultIndex: indexPatternString,
        'dateFormat:tz': 'UTC',
      });
      await kibanaServer.importExport.load(fixtureDirs.lensBasic);
      await kibanaServer.importExport.load(fixtureDirs.lensDefault);
    });

    after(async () => {
      await esArchiver.unload(esArchive);
      await PageObjects.timePicker.resetDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.importExport.unload(fixtureDirs.lensBasic);
      await kibanaServer.importExport.unload(fixtureDirs.lensDefault);
    });

    loadTestFile(require.resolve('../group3/open_in_lens/tsvb/metric'));
    loadTestFile(require.resolve('../group3/open_in_lens/tsvb/gauge'));
    loadTestFile(require.resolve('../group3/open_in_lens/tsvb/timeseries'));
  });
}
