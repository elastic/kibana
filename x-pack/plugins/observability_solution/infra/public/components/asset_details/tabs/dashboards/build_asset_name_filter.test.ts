/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { getFilterByAssetName } from './build_asset_name_filter';

describe('getFilterByAssetName', function () {
  it('should build a host name filter', () => {
    dataView.getFieldByName = jest.fn().mockReturnValue({
      name: 'host.name',
    });
    const result = getFilterByAssetName('host1', 'host', dataView);
    expect(result[0]).toMatchObject({ query: { match_phrase: { 'host.name': 'host1' } } });
  });

  it('should return an empty array if the field name is not found', () => {
    dataView.getFieldByName = jest.fn().mockReturnValue(undefined);
    const result = getFilterByAssetName('host1', 'host', dataView);
    expect(result).toStrictEqual([]);
  });
});
