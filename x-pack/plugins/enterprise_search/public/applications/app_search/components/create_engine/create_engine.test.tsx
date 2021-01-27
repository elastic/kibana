/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockValues } from '../../../__mocks__';

import { CreateEngine } from './';

describe('CreateEngine', () => {
  const values = {
    name: '',
    rawName: '',
    language: 'Universal',
  };

  describe('default values', () => {
    beforeEach(() => {
      setMockValues(values);
    });

    it('renders', () => {
      const wrapper = shallow(<CreateEngine />);
      expect(wrapper.find('[data-test-subj="CreateEngine"]')).toHaveLength(1);
    });

    it('contains a form', () => {
      const wrapper = shallow(<CreateEngine />);
      expect(wrapper.find('[data-test-subj="CreateEngineForm"]')).toHaveLength(1);
    });

    it('contains a name input', () => {
      const wrapper = shallow(<CreateEngine />);
      expect(wrapper.find('[data-test-subj="CreateEngineNameInput"]')).toHaveLength(1);
    });

    it('contains a language input', () => {
      const wrapper = shallow(<CreateEngine />);
      expect(wrapper.find('[data-test-subj="CreateEngineLanguageInput"]')).toHaveLength(1);
    });

    it('contains a submit button', () => {
      const wrapper = shallow(<CreateEngine />);
      expect(wrapper.find('[data-test-subj="NewEngineSubmitButton"]')).toHaveLength(1);
    });
  });
});
