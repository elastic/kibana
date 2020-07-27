/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import '../../../common/mock/match_media';
import { useIndexPatterns } from '../../../common/hooks/use_index_patterns';
import { EmbeddedMapComponent } from './embedded_map';

const mockUseIndexPatterns = useIndexPatterns as jest.Mock;
jest.mock('../../../common/hooks/use_index_patterns');
mockUseIndexPatterns.mockImplementation(() => [true, []]);

jest.mock('../../../common/lib/kibana');

describe('EmbeddedMapComponent', () => {
  let setQuery: jest.Mock;

  beforeEach(() => {
    setQuery = jest.fn();
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <EmbeddedMapComponent
        endDate="2019-08-28T05:50:57.877Z"
        filters={[]}
        query={{ query: '', language: 'kuery' }}
        setQuery={setQuery}
        startDate="2019-08-28T05:50:47.877Z"
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
