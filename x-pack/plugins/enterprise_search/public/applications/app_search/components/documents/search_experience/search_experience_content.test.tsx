/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../../../__mocks__/kea.mock';
import { setMockSearchContextState } from './__mocks__/hooks.mock';

import React from 'react';

import { shallow } from 'enzyme';
import { EuiFlexGroup } from '@elastic/eui';
// @ts-expect-error types are not available for this package yet
import { Results } from '@elastic/react-search-ui';

import { ResultView } from './views';
import { SearchExperienceContent } from './search_experience_content';

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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockSearchContextState(searchState);
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

  it('renders pagination', () => {
    const wrapper = shallow(<SearchExperienceContent />);
    const pagination = wrapper.find('Pagination').at(0).dive();
    expect(pagination.find(EuiFlexGroup).length).toBe(1);
  });

  it('renders empty if a search was not performed yet', () => {
    setMockSearchContextState({
      ...searchState,
      wasSearched: false,
    });
    const wrapper = shallow(<SearchExperienceContent />);
    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('renders results if a search was performend and there are more than 0 totalResults', () => {
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
      const wrapper = shallow(<SearchExperienceContent />);
      const noDocumentsErrorActions: any = wrapper
        .find('[data-test-subj="documentsSearchNoDocuments"]')
        .prop('actions');

      expect(
        shallow(noDocumentsErrorActions).find('[data-test-subj="IndexDocumentsButton"]').length
      ).toBe(1);
    });

    it('will include a button to documentation if this is a meta engine', () => {
      setMockValues({
        ...values,
        isMetaEngine: true,
      });

      const wrapper = shallow(<SearchExperienceContent />);

      const noDocumentsErrorActions: any = wrapper
        .find('[data-test-subj="documentsSearchNoDocuments"]')
        .prop('actions');

      expect(
        shallow(noDocumentsErrorActions).find('[data-test-subj="IndexDocumentsButton"]').length
      ).toBe(0);
      expect(
        shallow(noDocumentsErrorActions).find('[data-test-subj="documentsSearchDocsLink"]').length
      ).toBe(1);
    });

    it('will include a button to documentation if the user cannot manage documents', () => {
      setMockValues({
        ...values,
        myRole: { canManageEngineDocuments: false },
      });

      const wrapper = shallow(<SearchExperienceContent />);

      const noDocumentsErrorActions: any = wrapper
        .find('[data-test-subj="documentsSearchNoDocuments"]')
        .prop('actions');

      expect(
        shallow(noDocumentsErrorActions).find('[data-test-subj="IndexDocumentsButton"]').length
      ).toBe(0);
      expect(
        shallow(noDocumentsErrorActions).find('[data-test-subj="documentsSearchDocsLink"]').length
      ).toBe(1);
    });
  });
});
