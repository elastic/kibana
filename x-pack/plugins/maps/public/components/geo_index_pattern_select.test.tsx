/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../kibana_services', () => {
  const MockIndexPatternSelect = (props: unknown) => {
    return <div />;
  };
  const MockHttp = {
    basePath: {
      prepend: (path: string) => {
        return `abc/${path}`;
      },
    },
  };
  return {
    getIndexPatternSelectComponent: () => {
      return MockIndexPatternSelect;
    },
    getHttp: () => {
      return MockHttp;
    },
  };
});

import React from 'react';
import { shallow } from 'enzyme';
import { GeoIndexPatternSelect } from './geo_index_pattern_select';

test('should render', async () => {
  const component = shallow(<GeoIndexPatternSelect onChange={() => {}} value={'indexPatternId'} />);

  expect(component).toMatchSnapshot();
});

test('should render no index pattern warning when there are no matching index patterns', async () => {
  const component = shallow(<GeoIndexPatternSelect onChange={() => {}} value={'indexPatternId'} />);
  component.setState({ noIndexPatternsExist: true });
  expect(component).toMatchSnapshot();
});
