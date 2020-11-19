/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { setMockValues } from '../../../../__mocks__/kea.mock';
import React from 'react';

import { shallow } from 'enzyme';
import { EuiFlexGroup } from '@elastic/eui';
// @ts-expect-error types are not available for this package yet
import { Results } from '@elastic/react-search-ui';

import { ResultView } from './views';
import { SearchExperienceContent } from './search_experience_content';

describe('SearchExperienceContent', () => {
  const values = {
    engineName: 'engine1',
  };
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
  });

  it('renders', () => {
    const wrapper = shallow(<SearchExperienceContent />);
    expect(wrapper.find(EuiFlexGroup).length).toBe(1);
  });

  it('passes engineName to the result view', () => {
    const props = {
      result: {
        foo: {
          raw: 'bar',
        },
      },
    };

    const wrapper = shallow(<SearchExperienceContent />);
    const resultView: any = wrapper.find(Results).prop('resultView');
    expect(resultView(props)).toEqual(<ResultView engineName="engine1" {...props} />);
  });
});
