/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { GeoIndexPatternSelect } from './geo_index_pattern_select';
import { DataViewsContract } from 'src/plugins/data/public';
import { HttpSetup } from 'kibana/public';

class MockIndexPatternSelectComponent extends React.Component {
  render() {
    return 'MockIndexPatternSelectComponent';
  }
}

function makeMockIndexPattern(id: string, fields: unknown) {
  return {
    id,
    fields,
  };
}

const mockIndexPatternService: DataViewsContract = {
  get(id: string) {
    if (id === 'foobar_with_geopoint') {
      return makeMockIndexPattern(id, [{ type: 'geo_point' }]);
    } else if (id === 'foobar_without_geopoint') {
      return makeMockIndexPattern(id, [{ type: 'string' }]);
    }
  },
} as unknown as DataViewsContract;

test('should render without error after mounting', async () => {
  const component = shallow(
    <GeoIndexPatternSelect
      http={{} as unknown as HttpSetup}
      onChange={() => {}}
      value={'foobar_with_geopoint'}
      includedGeoTypes={['geo_point']}
      indexPatternService={mockIndexPatternService}
      IndexPatternSelectComponent={MockIndexPatternSelectComponent}
    />
  );

  // Ensure all promises resolve
  await new Promise((resolve) => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();
  expect(component).toMatchSnapshot();
});

test('should render with error when data view does not have geo_point field', async () => {
  const component = shallow(
    <GeoIndexPatternSelect
      http={{} as unknown as HttpSetup}
      onChange={() => {}}
      value={'foobar_without_geopoint'}
      includedGeoTypes={['geo_point']}
      indexPatternService={mockIndexPatternService}
      IndexPatternSelectComponent={MockIndexPatternSelectComponent}
    />
  );

  // Ensure all promises resolve
  await new Promise((resolve) => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();
  expect(component).toMatchSnapshot();
});
