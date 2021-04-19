/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { indexPatternList, ObservabilityIndexPatterns } from './observability_index_patterns';
import { mockCore, mockIndexPattern } from '../rtl_helpers';
import { SavedObjectNotFound } from '../../../../../../../../src/plugins/kibana_utils/public';

const fieldFormats = {
  'transaction.duration.us': {
    id: 'duration',
    params: {
      inputFormat: 'microseconds',
      outputFormat: 'asSeconds',
      outputPrecision: 1,
      showSuffix: true,
    },
  },
  'transaction.experience.fid': {
    id: 'duration',
    params: { inputFormat: 'milliseconds', outputFormat: 'asSeconds', showSuffix: true },
  },
  'transaction.experience.tbt': {
    id: 'duration',
    params: { inputFormat: 'milliseconds', outputFormat: 'asSeconds', showSuffix: true },
  },
  'transaction.marks.agent.firstContentfulPaint': {
    id: 'duration',
    params: { inputFormat: 'milliseconds', outputFormat: 'asSeconds', showSuffix: true },
  },
  'transaction.marks.agent.largestContentfulPaint': {
    id: 'duration',
    params: { inputFormat: 'milliseconds', outputFormat: 'asSeconds', showSuffix: true },
  },
};

describe('ObservabilityIndexPatterns', function () {
  const { data } = mockCore();
  data!.indexPatterns.get = jest.fn().mockReturnValue({ title: 'index-*' });
  data!.indexPatterns.createAndSave = jest.fn().mockReturnValue({ id: indexPatternList.ux });
  data!.indexPatterns.updateSavedObject = jest.fn();

  it('should return index pattern for app', async function () {
    const obsv = new ObservabilityIndexPatterns(data!);

    const indexP = await obsv.getIndexPattern('ux');

    expect(indexP).toEqual({ title: 'index-*' });

    expect(data?.indexPatterns.get).toHaveBeenCalledWith(indexPatternList.ux);
    expect(data?.indexPatterns.get).toHaveBeenCalledTimes(1);
  });

  it('should creates missing index pattern', async function () {
    data!.indexPatterns.get = jest.fn().mockImplementation(() => {
      throw new SavedObjectNotFound('index_pattern');
    });

    const obsv = new ObservabilityIndexPatterns(data!);

    const indexP = await obsv.getIndexPattern('ux');

    expect(indexP).toEqual({ id: indexPatternList.ux });

    expect(data?.indexPatterns.createAndSave).toHaveBeenCalledWith({
      fieldFormats,
      id: 'rum_static_index_pattern_id',
      timeFieldName: '@timestamp',
      title: '(rum-data-view)*,apm-*',
    });
    expect(data?.indexPatterns.createAndSave).toHaveBeenCalledTimes(1);
  });

  it('should return getFieldFormats', function () {
    const obsv = new ObservabilityIndexPatterns(data!);

    expect(obsv.getFieldFormats('ux')).toEqual(fieldFormats);
  });

  it('should validate field formats', async function () {
    mockIndexPattern.getFormatterForField = jest.fn().mockReturnValue({ params: () => {} });

    const obsv = new ObservabilityIndexPatterns(data!);

    await obsv.validateFieldFormats('ux', mockIndexPattern);

    expect(data?.indexPatterns.updateSavedObject).toHaveBeenCalledTimes(1);
    expect(data?.indexPatterns.updateSavedObject).toHaveBeenCalledWith(
      expect.objectContaining({ fieldFormatMap: fieldFormats })
    );
  });
});
