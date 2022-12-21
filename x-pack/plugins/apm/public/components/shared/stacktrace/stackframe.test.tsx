/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ReactWrapper, shallow } from 'enzyme';
import { Stackframe } from '../../../../typings/es_schemas/raw/fields/stackframe';
import { mountWithTheme } from '../../../utils/test_helpers';
import { Stackframe as StackframeComponent } from './stackframe';
import stacktracesMock from './__fixtures__/stacktraces.json';

describe('Stackframe', () => {
  describe('when stackframe has source lines', () => {
    let wrapper: ReactWrapper;
    beforeEach(() => {
      const stackframe = stacktracesMock[0];
      wrapper = mountWithTheme(
        <StackframeComponent id="test" stackframe={stackframe} />
      );
    });

    it('renders', () => {
      expect(() =>
        mountWithTheme(
          <StackframeComponent id="test" stackframe={stacktracesMock[0]} />
        )
      ).not.toThrowError();
    });

    it('should render FrameHeading, Context and Variables', () => {
      expect(wrapper.find('FrameHeading').length).toBe(1);
      expect(wrapper.find('Context').length).toBe(1);
      expect(wrapper.find('Variables').length).toBe(1);
    });

    it('should have isLibraryFrame=false as default', () => {
      expect(wrapper.find('Context').prop('isLibraryFrame')).toBe(false);
    });
  });

  describe('when stackframe does not have source lines', () => {
    let wrapper: ReactWrapper;
    beforeEach(() => {
      const stackframe = { line: {} } as Stackframe;
      wrapper = mountWithTheme(
        <StackframeComponent id="test" stackframe={stackframe} />
      );
    });

    it('should render only FrameHeading', () => {
      expect(wrapper.find('FrameHeading').length).toBe(1);
      expect(wrapper.find('Context').length).toBe(0);
      expect(wrapper.find('Variables').length).toBe(0);
    });

    it('should have isLibraryFrame=false as default', () => {
      expect(wrapper.find('FrameHeading').prop('isLibraryFrame')).toBe(false);
    });
  });

  it('should respect isLibraryFrame', () => {
    const stackframe = { line: {} } as Stackframe;
    const wrapper = shallow(
      <StackframeComponent id="test" stackframe={stackframe} isLibraryFrame />
    );
    expect(wrapper.find('FrameHeading').prop('isLibraryFrame')).toBe(true);
  });
});
