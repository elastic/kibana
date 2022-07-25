/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import * as Languages from './languages';

import { ElasticsearchClientInstructions } from '.';

describe('Elasticsearch Client Instructions', () => {
  let wrapper: ShallowWrapper;

  afterEach(() => {
    jest.clearAllMocks();
  });

  const setup = (language: string) => {
    setMockValues({
      cloud: {
        cloudId: 'example-cloud-id',
      },
    });
    wrapper = shallow(<ElasticsearchClientInstructions language={language} />);
  };

  describe('Displaying the right language options', () => {
    it.concurrent.each([
      ['dotnet', Languages.ElasticsearchDotnet, false],
      ['go', Languages.ElasticsearchGo, true],
      ['java', Languages.ElasticsearchJava, false],
      ['javascript', Languages.ElasticsearchJavascript, true],
      ['php', Languages.ElasticsearchPhp, true],
      ['python', Languages.ElasticsearchPython, true],
      ['ruby', Languages.ElasticsearchRuby, true],
      ['rust', Languages.ElasticsearchRust, false],
    ])('%s', (language, Component, hasCloudIdProp) => {
      setup(language);
      expect(wrapper.find(Component)).toHaveLength(1);
      expect(wrapper.find(Component).prop('cloudId')).toEqual(
        hasCloudIdProp ? 'example-cloud-id' : undefined
      );
    });
  });

  it('does not display language for unrecognised language', () => {
    setup('coffeescript');
    expect(wrapper.isEmptyRender()).toEqual(true);
  });
});
