/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataViewList, ObservabilityDataViews } from './observability_data_views';
import { mockCore, mockDataView } from '../../components/shared/exploratory_view/rtl_helpers';
import { SavedObjectNotFound } from '../../../../../../src/plugins/kibana_utils/public';

const fieldFormats = {
  'transaction.duration.us': {
    id: 'duration',
    params: {
      inputFormat: 'microseconds',
      outputFormat: 'asSeconds',
      outputPrecision: 1,
      showSuffix: true,
      useShortSuffix: true,
    },
  },
  'transaction.experience.fid': {
    id: 'duration',
    params: {
      inputFormat: 'milliseconds',
      outputFormat: 'humanizePrecise',
      showSuffix: true,
      useShortSuffix: true,
    },
  },
  'transaction.experience.tbt': {
    id: 'duration',
    params: {
      inputFormat: 'milliseconds',
      outputFormat: 'humanizePrecise',
      showSuffix: true,
      useShortSuffix: true,
    },
  },
  'transaction.marks.agent.firstContentfulPaint': {
    id: 'duration',
    params: {
      inputFormat: 'milliseconds',
      outputFormat: 'humanizePrecise',
      showSuffix: true,
      useShortSuffix: true,
    },
  },
  'transaction.marks.agent.largestContentfulPaint': {
    id: 'duration',
    params: {
      inputFormat: 'milliseconds',
      outputFormat: 'humanizePrecise',
      showSuffix: true,
      useShortSuffix: true,
    },
  },
  'transaction.marks.agent.timeToFirstByte': {
    id: 'duration',
    params: {
      inputFormat: 'milliseconds',
      outputFormat: 'humanizePrecise',
      showSuffix: true,
      useShortSuffix: true,
    },
  },
};

describe('ObservabilityIndexPatterns', function () {
  const { dataViews } = mockCore();
  dataViews!.get = jest.fn().mockReturnValue({ title: 'index-*' });
  dataViews!.createAndSave = jest.fn().mockReturnValue({ id: dataViewList.ux });
  dataViews!.updateSavedObject = jest.fn();

  it('should return index pattern for app', async function () {
    const obsv = new ObservabilityDataViews(dataViews!);

    const indexP = await obsv.getDataView('ux', 'heartbeat-8*,synthetics-*');

    expect(indexP).toEqual({ id: 'rum_static_index_pattern_id' });

    expect(dataViews?.get).toHaveBeenCalledWith(
      'rum_static_index_pattern_id_heartbeat_8_synthetics_'
    );
    expect(dataViews?.get).toHaveBeenCalledTimes(1);
  });

  it('should creates missing index pattern', async function () {
    dataViews!.get = jest.fn().mockImplementation(() => {
      throw new SavedObjectNotFound('index_pattern');
    });

    dataViews!.createAndSave = jest.fn().mockReturnValue({ id: dataViewList.ux });

    const obsv = new ObservabilityDataViews(dataViews!);

    const indexP = await obsv.getDataView('ux', 'trace-*,apm-*');

    expect(indexP).toEqual({ id: dataViewList.ux });

    expect(dataViews?.createAndSave).toHaveBeenCalledWith({
      fieldFormats,
      id: 'rum_static_index_pattern_id_trace_apm_',
      timeFieldName: '@timestamp',
      title: '(rum-data-view)*,trace-*,apm-*',
    });

    expect(dataViews?.createAndSave).toHaveBeenCalledTimes(1);
  });

  it('should return getFieldFormats', function () {
    const obsv = new ObservabilityDataViews(dataViews!);

    expect(obsv.getFieldFormats('ux')).toEqual(fieldFormats);
  });

  it('should validate field formats', async function () {
    mockDataView.getFormatterForField = jest.fn().mockReturnValue({ params: () => {} });

    const obsv = new ObservabilityDataViews(dataViews!);

    await obsv.validateFieldFormats('ux', mockDataView);

    expect(dataViews?.updateSavedObject).toHaveBeenCalledTimes(1);
    expect(dataViews?.updateSavedObject).toHaveBeenCalledWith(
      expect.objectContaining({ fieldFormatMap: fieldFormats })
    );
  });
});
