/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['settings', 'common']);
  const es = getService('es');

  describe('index pattern filter', function describeIndexTests() {
    before(async function () {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
      // TODO: Navigation to Data View Management is different in Serverless
      await PageObjects.common.navigateToApp('management');
      await testSubjects.click('app-card-dataViews');
    });

    after(async function () {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    beforeEach(async function () {
      await PageObjects.settings.createIndexPattern('logstash-*');
    });

    afterEach(async function () {
      await PageObjects.settings.removeIndexPattern();
    });

    it('should filter indexed fields by type', async function () {
      // TODO: Navigation to Data View Management is different in Serverless
      await PageObjects.common.navigateToApp('management');
      await testSubjects.click('app-card-dataViews');
      await PageObjects.settings.clickIndexPatternLogstash();
      await PageObjects.settings.getFieldTypes();
      await PageObjects.settings.setFieldTypeFilter('keyword');

      await retry.try(async function () {
        const fieldTypes = await PageObjects.settings.getFieldTypes();
        expect(fieldTypes.length).to.be.above(0);
        for (const fieldType of fieldTypes) {
          expect(fieldType).to.be('keyword');
        }
      });
      await PageObjects.settings.clearFieldTypeFilter('keyword');

      await PageObjects.settings.setFieldTypeFilter('long');

      await retry.try(async function () {
        const fieldTypes = await PageObjects.settings.getFieldTypes();
        expect(fieldTypes.length).to.be.above(0);
        for (const fieldType of fieldTypes) {
          expect(fieldType).to.be('long');
        }
      });
      await PageObjects.settings.clearFieldTypeFilter('long');
    });

    it('should filter indexed fields by schema type', async function () {
      // TODO: Navigation to Data View Management is different in Serverless
      await PageObjects.common.navigateToApp('management');
      await testSubjects.click('app-card-dataViews');
      await PageObjects.settings.clickIndexPatternLogstash();

      await PageObjects.settings.addRuntimeField('_test', 'keyword', "emit('hi')");

      const unfilteredFields = [
        '@message',
        '@message.raw',
        '@tags',
        '@tags.raw',
        '@timestamp',
        '_id',
        '_ignored',
        '_index',
        '_score',
        '_source',
      ];

      expect(await PageObjects.settings.getFieldNames()).to.eql(unfilteredFields);

      await PageObjects.settings.setSchemaFieldTypeFilter('runtime');

      expect(await PageObjects.settings.getFieldNames()).to.eql(['_test']);

      await PageObjects.settings.setSchemaFieldTypeFilter('indexed');

      expect(await PageObjects.settings.getFieldNames()).to.eql(unfilteredFields);
    });

    it('should filter indexed fields when searched', async function () {
      // TODO: Navigation to Data View Management is different in Serverless
      await PageObjects.common.navigateToApp('management');
      await testSubjects.click('app-card-dataViews');
      await PageObjects.settings.clickIndexPatternLogstash();

      const unfilteredFields = [
        '@message',
        '@message.raw',
        '@tags',
        '@tags.raw',
        '@timestamp',
        '_id',
        '_ignored',
        '_index',
        '_score',
        '_source',
      ];

      expect(await PageObjects.settings.getFieldNames()).to.eql(unfilteredFields);

      await PageObjects.settings.filterField('@');

      expect(await PageObjects.settings.getFieldNames()).to.eql([
        '@message',
        '@message.raw',
        '@tags',
        '@tags.raw',
        '@timestamp',
      ]);

      await PageObjects.settings.filterField('@message');

      expect(await PageObjects.settings.getFieldNames()).to.eql(['@message', '@message.raw']);

      expect(
        (await testSubjects.getVisibleText('tab-indexedFields')).startsWith('Fields (2 /')
      ).to.be(true);

      await testSubjects.click('clearSearchButton');

      expect(await PageObjects.settings.getFieldNames()).to.eql(unfilteredFields);
    });

    it('should set "conflict" filter when "View conflicts" button is pressed', async function () {
      const additionalIndexWithWrongMapping = 'logstash-wrong';
      // TODO: Navigation to Data View Management is different in Serverless
      await PageObjects.common.navigateToApp('management');
      await testSubjects.click('app-card-dataViews');

      if (await es.indices.exists({ index: additionalIndexWithWrongMapping })) {
        await es.indices.delete({ index: additionalIndexWithWrongMapping });
      }

      await es.indices.create({
        index: additionalIndexWithWrongMapping,
        body: {
          mappings: {
            properties: {
              bytes: {
                type: 'keyword',
              },
            },
          },
        },
      });

      await es.index({
        index: additionalIndexWithWrongMapping,
        body: {
          bytes: 'wrong_value',
        },
        refresh: 'wait_for',
      });

      await PageObjects.settings.clickIndexPatternLogstash();

      await PageObjects.settings.refreshDataViewFieldList();

      await testSubjects.existOrFail('dataViewMappingConflict');

      expect(await PageObjects.settings.getFieldTypes()).to.eql([
        'text',
        'keyword',
        'text',
        'keyword',
        'date',
        '_id',
        '_ignored',
        '_index',
        '',
        '_source',
      ]);

      // set other filters to check if they get reset after pressing the button
      await PageObjects.settings.filterField('unknown');
      await PageObjects.settings.setFieldTypeFilter('text');
      await PageObjects.settings.setSchemaFieldTypeFilter('runtime');
      expect(await PageObjects.settings.getFieldTypes()).to.eql([]);

      // check that only a conflicting field is shown
      await testSubjects.click('viewDataViewMappingConflictsButton');
      expect(await PageObjects.settings.getFieldTypes()).to.eql(['keyword, long\nConflict']);
      expect(await PageObjects.settings.getFieldNames()).to.eql(['bytes']);

      await es.indices.delete({ index: additionalIndexWithWrongMapping });
    });
  });
}
