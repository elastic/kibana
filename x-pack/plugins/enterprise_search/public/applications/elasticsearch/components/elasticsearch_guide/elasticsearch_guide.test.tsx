/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiSteps, EuiSelect } from '@elastic/eui';

import { ElasticsearchClientInstructions } from '../elasticsearch_client_instructions';

import { ElasticsearchGuide } from '.';

describe('Elasticsearch Guide Component', () => {
  let wrapper: ShallowWrapper;

  const setup = (param: string) => {
    Object.defineProperty(window, 'location', {
      value: { search: param },
      writable: true,
    });
    wrapper = shallow(<ElasticsearchGuide />);
  };

  describe('Rendering Language option ', () => {
    it('should use default language (java)', () => {
      setup('');
      const clientInstructionsElement = wrapper
        .find(EuiSteps)
        .dive()
        .find(ElasticsearchClientInstructions);
      expect(clientInstructionsElement.prop('language')).toBe('java');
    });

    it('should use language from param (ruby)', () => {
      setup('?client=ruby');
      const clientInstructionsElement = wrapper
        .find(EuiSteps)
        .dive()
        .find(ElasticsearchClientInstructions);
      expect(clientInstructionsElement.prop('language')).toBe('ruby');
    });

    it('should fallback to java if client not recognised', () => {
      setup('?client=coffeescript');
      const clientInstructionsElement = wrapper
        .find(EuiSteps)
        .dive()
        .find(ElasticsearchClientInstructions);
      expect(clientInstructionsElement.prop('language')).toBe('java');
    });
  });

  describe('Changing Language option', () => {
    it('should change the client instructions language prop when choosing another option', () => {
      setup('');
      const languageSelectElement = wrapper.find(EuiSteps).dive().find(EuiSelect);
      languageSelectElement.simulate('change', { target: { value: 'ruby' } });

      wrapper.update();

      const clientInstructionsElement = wrapper
        .find(EuiSteps)
        .dive()
        .find(ElasticsearchClientInstructions);
      expect(clientInstructionsElement.prop('language')).toBe('ruby');
    });
  });
});
