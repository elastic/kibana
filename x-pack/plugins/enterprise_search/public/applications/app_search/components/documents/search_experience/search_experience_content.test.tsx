/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockSearchContextState } from './__mocks__/hooks.mock';
import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { Results } from '@elastic/react-search-ui';

import { Loading } from '../../../../shared/loading';
import { SchemaType } from '../../../../shared/schema/types';

import { Pagination } from './pagination';
import { SearchExperienceContent } from './search_experience_content';
import { ResultView } from './views';

describe('SearchExperienceContent', () => {
  const searchState = {
    resultSearchTerm: 'searchTerm',
    totalResults: 100,
    wasSearched: true,
  };
  const values = {
    engineName: 'engine1',
    isMetaEngine: false,
    myRole: { canManageEngineDocuments: true },
    engine: {
      schema: {
        title: SchemaType.Text,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockSearchContextState(searchState);
  });

  it('renders', () => {
    const wrapper = shallow(<SearchExperienceContent />);
    expect(wrapper.isEmptyRender()).toBe(false);
  });

  it('passes result, schema, and isMetaEngine to the result view', () => {
    const result = {
      id: {
        raw: '1',
      },
      _meta: {
        id: '1',
        score: 100,
        engine: 'my-engine',
      },
      foo: {
        raw: 'bar',
      },
    };

    const wrapper = shallow(<SearchExperienceContent />);
    const resultView: any = wrapper.find(Results).prop('resultView');
    expect(resultView({ result })).toEqual(
      <ResultView
        {...{
          isMetaEngine: values.isMetaEngine,
          result,
          schemaForTypeHighlights: values.engine.schema,
        }}
      />
    );
  });

  it('renders pagination', () => {
    const wrapper = shallow(<SearchExperienceContent />);
    expect(wrapper.find(Pagination).exists()).toBe(true);
  });

  it('renders a loading state if a search was not performed yet', () => {
    setMockSearchContextState({
      ...searchState,
      wasSearched: false,
    });
    const wrapper = shallow(<SearchExperienceContent />);
    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('renders results if a search was performed and there are more than 0 totalResults', () => {
    setMockSearchContextState({
      ...searchState,
      wasSearched: true,
      totalResults: 10,
    });
    const wrapper = shallow(<SearchExperienceContent />);
    expect(wrapper.find('[data-test-subj="documentsSearchResults"]').length).toBe(1);
  });

  it('renders a no results message if a non-empty search was performed and there are no results', () => {
    setMockSearchContextState({
      ...searchState,
      resultSearchTerm: 'searchTerm',
      wasSearched: true,
      totalResults: 0,
    });
    const wrapper = shallow(<SearchExperienceContent />);
    expect(wrapper.find('[data-test-subj="documentsSearchResults"]').length).toBe(0);
    expect(wrapper.find('[data-test-subj="documentsSearchNoResults"]').length).toBe(1);
  });

  it('renders empty if an empty search was performed and there are no results', () => {
    // In a real world scenario this does not happen - wasSearched returns false before this final branch
    setMockSearchContextState({
      ...searchState,
      resultSearchTerm: '',
      totalResults: 0,
      wasSearched: true,
    });
    const wrapper = shallow(<SearchExperienceContent />);
    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
