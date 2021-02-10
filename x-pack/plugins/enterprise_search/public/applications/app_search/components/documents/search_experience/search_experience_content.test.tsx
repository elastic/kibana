/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea.mock';

import React from 'react';

import { shallow, mount } from 'enzyme';

// @ts-expect-error types are not available for this package yet
import { Results } from '@elastic/react-search-ui';

import { SchemaTypes } from '../../../../shared/types';

import { setMockSearchContextState } from './__mocks__/hooks.mock';
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
        title: 'string' as SchemaTypes,
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

  it('renders empty if a search was not performed yet', () => {
    setMockSearchContextState({
      ...searchState,
      wasSearched: false,
    });
    const wrapper = shallow(<SearchExperienceContent />);
    expect(wrapper.isEmptyRender()).toBe(true);
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

  describe('when an empty search was performed and there are no results, meaning there are no documents indexed', () => {
    beforeEach(() => {
      setMockSearchContextState({
        ...searchState,
        resultSearchTerm: '',
        wasSearched: true,
        totalResults: 0,
      });
    });

    it('renders a no documents message', () => {
      const wrapper = shallow(<SearchExperienceContent />);
      expect(wrapper.find('[data-test-subj="documentsSearchResults"]').length).toBe(0);
      expect(wrapper.find('[data-test-subj="documentsSearchNoDocuments"]').length).toBe(1);
    });

    it('will include a button to index new documents', () => {
      const wrapper = mount(<SearchExperienceContent />);
      expect(
        wrapper
          .find(
            '[data-test-subj="documentsSearchNoDocuments"] [data-test-subj="IndexDocumentsButton"]'
          )
          .exists()
      ).toBe(true);
    });

    it('will include a button to documentation if this is a meta engine', () => {
      setMockValues({
        ...values,
        isMetaEngine: true,
      });

      const wrapper = mount(<SearchExperienceContent />);

      expect(
        wrapper
          .find(
            '[data-test-subj="documentsSearchNoDocuments"] [data-test-subj="IndexDocumentsButton"]'
          )
          .exists()
      ).toBe(false);

      expect(
        wrapper
          .find(
            '[data-test-subj="documentsSearchNoDocuments"] [data-test-subj="documentsSearchDocsLink"]'
          )
          .exists()
      ).toBe(true);
    });

    it('will include a button to documentation if the user cannot manage documents', () => {
      setMockValues({
        ...values,
        myRole: { canManageEngineDocuments: false },
      });

      const wrapper = mount(<SearchExperienceContent />);

      expect(
        wrapper
          .find(
            '[data-test-subj="documentsSearchNoDocuments"] [data-test-subj="IndexDocumentsButton"]'
          )
          .exists()
      ).toBe(false);

      expect(
        wrapper
          .find(
            '[data-test-subj="documentsSearchNoDocuments"] [data-test-subj="documentsSearchDocsLink"]'
          )
          .exists()
      ).toBe(true);
    });
  });
});
