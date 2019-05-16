/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { KibanaContext } from '../../common';
import { DefinePivotForm } from './define_pivot_form';

// workaround to make React.memo() work with enzyme
jest.mock('react', () => {
  const r = jest.requireActual('react');
  return { ...r, memo: (x: any) => x };
});

describe('Data Frame: <DefinePivotForm />', () => {
  test('Minimal initialization', () => {
    const currentIndexPattern = {
      title: 'the-index-pattern-title',
      fields: [],
    };

    // Using a wrapping <div> element because shallow() would fail
    // with the Provider being the outer most component.
    const wrapper = shallow(
      <div>
        <KibanaContext.Provider
          value={{ currentIndexPattern, indexPatterns: {}, kibanaConfig: {} }}
        >
          <DefinePivotForm onChange={() => {}} />
        </KibanaContext.Provider>
      </div>
    );

    expect(wrapper).toMatchSnapshot();
  });
});
