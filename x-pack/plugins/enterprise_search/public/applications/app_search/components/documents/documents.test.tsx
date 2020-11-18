/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { setMockValues } from '../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiPageHeader, EuiCallOut } from '@elastic/eui';

import { DocumentCreationButton } from './document_creation_button';
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
    expect(wrapper.find(EuiPageHeader).length).toEqual(1);
  });

  it('renders a DocumentCreationButton if the user can manage engine documents', () => {
    setMockValues({
      ...values,
      myRole: { canManageEngineDocuments: true },
    });

    const wrapper = shallow(<Documents engineBreadcrumb={['test']} />);
    expect(wrapper.find(DocumentCreationButton).length).toEqual(1);
  });

  describe('Meta Engines', () => {
    it('renders a Meta Engines message if this is a meta engine', () => {
      setMockValues({
        ...values,
        isMetaEngine: true,
      });

      const wrapper = shallow(<Documents engineBreadcrumb={['test']} />);
      expect(wrapper.find('MetaEngineCallout').dive().find(EuiCallOut).length).toEqual(1);
    });

    it('does not render a Meta Engines message if this is not a meta engine', () => {
      setMockValues({
        ...values,
        isMetaEngine: false,
      });

      const wrapper = shallow(<Documents engineBreadcrumb={['test']} />);
      expect(wrapper.find('MetaEngineCallout').length).toEqual(0);
    });

    it('does not render a DocumentCreationButton even if the user can manage engine documents', () => {
      setMockValues({
        ...values,
        myRole: { canManageEngineDocuments: true },
        isMetaEngine: true,
      });

      const wrapper = shallow(<Documents engineBreadcrumb={['test']} />);
      expect(wrapper.find(DocumentCreationButton).length).toEqual(0);
    });
  });
});
