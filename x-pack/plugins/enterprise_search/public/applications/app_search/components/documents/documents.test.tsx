/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { DocumentCreationButton } from './document_creation_button';
import { SearchExperience } from './search_experience';
import { Documents } from '.';

describe('Documents', () => {
  const values = {
    isMetaEngine: false,
    myRole: { canManageEngineDocuments: true },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
  });

  it('renders', () => {
    const wrapper = shallow(<Documents engineBreadcrumb={['test']} />);
    expect(wrapper.find(SearchExperience).exists()).toBe(true);
  });

  it('renders a DocumentCreationButton if the user can manage engine documents', () => {
    setMockValues({
      ...values,
      myRole: { canManageEngineDocuments: true },
    });

    const wrapper = shallow(<Documents engineBreadcrumb={['test']} />);
    expect(wrapper.find(DocumentCreationButton).exists()).toBe(true);
  });

  describe('Meta Engines', () => {
    it('renders a Meta Engines message if this is a meta engine', () => {
      setMockValues({
        ...values,
        isMetaEngine: true,
      });

      const wrapper = shallow(<Documents engineBreadcrumb={['test']} />);
      expect(wrapper.find('[data-test-subj="MetaEnginesCallout"]').exists()).toBe(true);
    });

    it('does not render a Meta Engines message if this is not a meta engine', () => {
      setMockValues({
        ...values,
        isMetaEngine: false,
      });

      const wrapper = shallow(<Documents engineBreadcrumb={['test']} />);
      expect(wrapper.find('[data-test-subj="MetaEnginesCallout"]').exists()).toBe(false);
    });

    it('does not render a DocumentCreationButton even if the user can manage engine documents', () => {
      setMockValues({
        ...values,
        myRole: { canManageEngineDocuments: true },
        isMetaEngine: true,
      });

      const wrapper = shallow(<Documents engineBreadcrumb={['test']} />);
      expect(wrapper.find(DocumentCreationButton).exists()).toBe(false);
    });
  });
});
