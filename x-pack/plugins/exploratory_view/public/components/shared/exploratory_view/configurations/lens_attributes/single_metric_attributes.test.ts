/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SingleMetricLensAttributes } from './single_metric_attributes';
import { ReportTypes } from '../../../../..';
import { mockAppDataView, mockDataView } from '../../rtl_helpers';
import { getDefaultConfigs } from '../default_configs';
import { obsvReportConfigMap } from '../../obsv_exploratory_view';
import { buildExistsFilter } from '../utils';
import { LensAttributes } from '../lens_attributes';
import { TRANSACTION_DURATION } from '../constants/elasticsearch_fieldnames';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';
import { FormulaPublicApi } from '@kbn/lens-plugin/public';
import { sampleMetricFormulaAttribute } from '../test_data/test_formula_metric_attribute';
import { DataTypes } from '../..';

describe('SingleMetricAttributes', () => {
  mockAppDataView();

  const reportViewConfig = getDefaultConfigs({
    reportType: ReportTypes.SINGLE_METRIC,
    dataType: 'ux',
    dataView: mockDataView,
    reportConfigMap: obsvReportConfigMap,
  });

  reportViewConfig.baseFilters?.push(...buildExistsFilter('transaction.type', mockDataView));

  let lnsAttr: LensAttributes;

  const layerConfig: any = {
    seriesConfig: reportViewConfig,
    operationType: 'median',
    dataView: mockDataView,
    reportDefinitions: {},
    time: { from: 'now-15m', to: 'now' },
    name: 'Page load time',
    selectedMetricField: TRANSACTION_DURATION,
  };

  const lensPluginMockStart = lensPluginMock.createStartContract();

  let formulaHelper: FormulaPublicApi;

  beforeEach(async () => {
    formulaHelper = (await lensPluginMockStart.stateHelperApi()).formula;
    lnsAttr = new SingleMetricLensAttributes(
      [layerConfig],
      ReportTypes.SINGLE_METRIC,
      formulaHelper
    );
  });

  it('returns attributes as expected', () => {
    const jsonAttr = lnsAttr.getJSON('lnsLegacyMetric');
    expect(jsonAttr).toEqual({
      description: '',
      references: [],
      state: {
        adHocDataViews: { [mockDataView.title]: mockDataView.toSpec(false) },
        internalReferences: [
          {
            id: 'apm-*',
            name: 'indexpattern-datasource-current-indexpattern',
            type: 'index-pattern',
          },
          {
            id: 'apm-*',
            name: 'indexpattern-datasource-layer-layer0',
            type: 'index-pattern',
          },
        ],
        datasourceStates: {
          formBased: {
            layers: {
              layer0: {
                columnOrder: ['layer-0-column-1'],
                columns: {
                  'layer-0-column-1': {
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Page load time',
                    operationType: 'median',
                    scale: 'ratio',
                    sourceField: 'transaction.duration.us',
                    params: {
                      emptyAsNull: true,
                    },
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [],
        query: {
          language: 'kuery',
          query:
            'transaction.type: page-load and processor.event: transaction and transaction.type : *',
        },
        visualization: {
          accessor: 'layer-0-column-1',
          layerId: 'layer0',
          layerType: 'data',
          size: 's',
        },
      },
      title: 'Prefilled from exploratory view app',
      visualizationType: 'lnsLegacyMetric',
    });
  });

  it('returns attributes as expected for percentile operation', () => {
    layerConfig.operationType = '99th';
    lnsAttr = new SingleMetricLensAttributes(
      [layerConfig],
      ReportTypes.SINGLE_METRIC,
      formulaHelper
    );

    const jsonAttr = lnsAttr.getJSON('lnsLegacyMetric');
    expect(jsonAttr).toEqual({
      description: '',
      references: [],
      state: {
        adHocDataViews: { [mockDataView.title]: mockDataView.toSpec(false) },
        internalReferences: [
          {
            id: 'apm-*',
            name: 'indexpattern-datasource-current-indexpattern',
            type: 'index-pattern',
          },
          {
            id: 'apm-*',
            name: 'indexpattern-datasource-layer-layer0',
            type: 'index-pattern',
          },
        ],
        datasourceStates: {
          formBased: {
            layers: {
              layer0: {
                columnOrder: ['layer-0-column-1'],
                columns: {
                  'layer-0-column-1': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Page load time',
                    operationType: 'percentile',
                    params: {
                      percentile: 99,
                    },
                    scale: 'ratio',
                    sourceField: 'transaction.duration.us',
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [],
        query: {
          language: 'kuery',
          query:
            'transaction.type: page-load and processor.event: transaction and transaction.type : *',
        },
        visualization: {
          accessor: 'layer-0-column-1',
          layerId: 'layer0',
          layerType: 'data',
          size: 's',
        },
      },
      title: 'Prefilled from exploratory view app',
      visualizationType: 'lnsLegacyMetric',
    });
  });

  it('returns attributes as expected for formula column', () => {
    const reportViewConfigFormula = getDefaultConfigs({
      reportType: ReportTypes.SINGLE_METRIC,
      dataType: DataTypes.SYNTHETICS,
      dataView: mockDataView,
      reportConfigMap: obsvReportConfigMap,
    });

    const layerConfigFormula: any = {
      seriesConfig: reportViewConfigFormula,
      operationType: 'median',
      dataView: mockDataView,
      reportDefinitions: {},
      time: { from: 'now-15m', to: 'now' },
      name: 'Availability',
      selectedMetricField: 'monitor_availability',
    };

    lnsAttr = new SingleMetricLensAttributes(
      [layerConfigFormula],
      ReportTypes.SINGLE_METRIC,
      formulaHelper
    );

    const jsonAttr = lnsAttr.getJSON('lnsLegacyMetric');
    expect(jsonAttr).toEqual(sampleMetricFormulaAttribute);
  });
});
