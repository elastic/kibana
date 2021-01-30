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
import { DefaultStringBooleanFalse } from '../../../../../../lists/common/schemas/types/default_string_boolean_false';

describe('CreateEngine', () => {
  const DEFAULT_VALUES = {
    name: '',
    rawName: '',
    language: 'Universal',
  };

  describe('default values', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders', () => {
      setMockValues(DEFAULT_VALUES);
      const wrapper = shallow(<CreateEngine />);
      expect(wrapper.find('[data-test-subj="CreateEngine"]')).toHaveLength(1);
    });

    it('contains a form', () => {
      setMockValues(DEFAULT_VALUES);
      const wrapper = shallow(<CreateEngine />);
      expect(wrapper.find('[data-test-subj="CreateEngineForm"]')).toHaveLength(1);
    });

    it('contains a name input', () => {
      setMockValues(DEFAULT_VALUES);
      const wrapper = shallow(<CreateEngine />);
      expect(wrapper.find('[data-test-subj="CreateEngineNameInput"]')).toHaveLength(1);
    });

    it('contains a language input', () => {
      setMockValues(DEFAULT_VALUES);
      const wrapper = shallow(<CreateEngine />);
      expect(wrapper.find('[data-test-subj="CreateEngineLanguageInput"]')).toHaveLength(1);
    });

    describe('NewEngineSubmitButton', () => {
      it('renders', () => {
        setMockValues(DEFAULT_VALUES);
        const wrapper = shallow(<CreateEngine />);
        expect(wrapper.find('[data-test-subj="NewEngineSubmitButton"]')).toHaveLength(1);
      });

      it('is disabled when name is empty', () => {
        setMockValues(DEFAULT_VALUES);
        const wrapper = shallow(<CreateEngine />);
        expect(wrapper.find('[data-test-subj="NewEngineSubmitButton"]').prop('disabled')).toEqual(
          true
        );
      });

      it('is enabled when name has a value', () => {
        setMockValues({ ...DEFAULT_VALUES, name: 'test', rawName: 'test' });
        const wrapper = shallow(<CreateEngine />);
        expect(wrapper.find('[data-test-subj="NewEngineSubmitButton"]').prop('disabled')).toEqual(
          false
        );
      });
    });
  });
});
