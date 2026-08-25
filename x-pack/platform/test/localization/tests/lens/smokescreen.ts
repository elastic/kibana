/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { range } from 'lodash';
import { NULL_LABEL } from '@kbn/field-formats-common';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { getI18nLocaleFromServerArgs } from '../utils';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { lens } = getPageObjects(['lens']);
  const find = getService('find');
  const config = getService('config');
  const browser = getService('browser');

  function getTranslationFr(term: string, field?: string) {
    switch (term) {
      case 'datatable':
        return 'Tableau';
      case 'Number':
        return 'Nombre';
      case 'Records':
        return 'Enregistrements';
      case 'records':
        return 'enregistrements';
      case 'moving_average':
        return 'Moyenne mobile de';
      case 'average':
        return field ? `Moyenne de ${field}` : `Moyenne`;
      case 'sum':
        return 'somme';
      case 'null':
        // fieldFormats.nullLabel
        return '(null)';
      default:
        return term;
    }
  }

  function getTranslationJa(term: string, field?: string) {
    switch (term) {
      case 'datatable':
        return '表';
      case 'Number':
        return '数字';
      case 'Records':
      case 'records':
        return '記録';
      case 'moving_average':
        return 'の移動平均';
      case 'average':
        return field ? `${field} の平均` : `平均`;
      case 'sum':
        return '合計';
      case 'null':
        // fieldFormats.nullLabel
        return '（null）';
      default:
        return term;
    }
  }

  function getTranslationZh(term: string, field?: string) {
    switch (term) {
      case 'datatable':
        return '表';
      case 'Number':
        return '数字';
      case 'Records':
      case 'records':
        return '记录';
      case 'moving_average':
        return '的移动平均值';
      case 'average':
        return field ? `${field} 的平均值` : '平均值';
      case 'sum':
        return '求和';
      case 'null':
        // fieldFormats.nullLabel
        return '（空）';
      default:
        return term;
    }
  }

  function getTranslationDe(term: string, field?: string) {
    switch (term) {
      case 'datatable':
        // xpack.lens.datatable.label
        return 'Tabelle';
      case 'Number':
        return 'Zahl';
      case 'Records':
        // xpack.lens.indexPattern.records
        return 'Einträge';
      case 'records':
        // xpack.lens.indexPattern.records
        return 'Einträge';
      case 'moving_average':
        // xpack.lens.indexPattern.movingAverage
        return 'Gleitender Durchschnitt';
      case 'average':
        // xpack.dataVisualizer.index.lensChart.averageOfLabel
        return field ? `Durchschnitt von ${field}` : `Durchschnitt`;
      case 'sum':
        // xpack.maps.aggType.sumLabel
        return 'Summe';
      case 'null':
        // fieldFormats.nullLabel
        return '(Null)';
      default:
        return term;
    }
  }

  function getExpectedI18nTranslator(locale: string): (term: string, field?: string) => string {
    switch (locale) {
      case 'ja-JP':
        return getTranslationJa;
      case 'zh-CN':
        return getTranslationZh;
      case 'fr-FR':
        return getTranslationFr;
      case 'de-DE':
        return getTranslationDe;
      default:
        return (v: string, field?: string) => (v === 'null' ? NULL_LABEL : v);
    }
  }

  describe('lens smokescreen tests', () => {
    let termTranslator: (term: string, field?: string) => string;

    before(async () => {
      const serverArgs: string[] = config.get('kbnTestServer.serverArgs');
      const kbnServerLocale = getI18nLocaleFromServerArgs(serverArgs);
      termTranslator = getExpectedI18nTranslator(kbnServerLocale);
      await browser.setWindowSize(1600, 1000);
    });

    it('should create a valid XY chart with references', async () => {
      await lens.openNewEditor();

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'moving_average',
        keepOpen: true,
      });
      await lens.configureReference({
        operation: termTranslator('sum'),
        field: 'bytes',
      });
      await lens.closeDimensionEditor();

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'cumulative_sum',
        keepOpen: true,
      });

      await lens.configureReference({
        field: termTranslator('Records'),
      });
      await lens.closeDimensionEditor();

      // Two Y axes that are both valid
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(2);
    });

    it('should allow formatting on references', async () => {
      await lens.openNewEditor();
      await lens.switchToVisualization('lnsDatatable', termTranslator('datatable'));

      await lens.configureDimension({
        dimension: 'lnsDatatable_rows > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
        disableEmptyRows: true,
      });
      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'moving_average',
        keepOpen: true,
      });
      await lens.configureReference({
        operation: termTranslator('sum'),
        field: 'bytes',
      });
      await lens.editDimensionFormat(termTranslator('Number'));
      await lens.closeDimensionEditor();

      await lens.waitForVisualization();

      const values = await Promise.all(
        range(0, 6).map((index) => lens.getDatatableCellText(index, 1))
      );
      expect(values).to.eql([
        termTranslator('null'),
        '222,420.00',
        '702,050.00',
        '1,879,613.33',
        '3,482,256.25',
        '4,359,953.00',
      ]);
    });

    it('should revert to previous configuration and not leave an incomplete column in the visualization config with reference-based operations', async () => {
      await lens.openNewEditor();

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'moving_average',
        field: termTranslator('Records'),
      });

      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.contain(
        termTranslator('moving_average')
      );

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'median',
        isPreviousIncompatible: true,
        keepOpen: true,
      });

      expect(await lens.isDimensionEditorOpen()).to.eql(true);

      await lens.closeDimensionEditor();

      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.contain(
        termTranslator('moving_average')
      );
    });
  });
}
