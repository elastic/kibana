/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, ShallowWrapper } from 'enzyme';
import React from 'react';
import { IStackframe } from 'x-pack/plugins/apm/typings/es_schemas/Stackframe';
import { hasSourceLines, Stackframe } from '../Stackframe';
import stacktracesMock from './stacktraces.json';

describe('Stackframe', () => {
  describe('when stackframe has source lines', () => {
    let wrapper: ShallowWrapper;
    beforeEach(() => {
      const stackframe = {
        line: { context: 'this is line context' }
      } as IStackframe;
      wrapper = shallow(<Stackframe stackframe={stackframe} />);
    });

    it('should render CodePreview', () => {
      expect(wrapper).toMatchSnapshot();
    });

    it('should have isLibraryFrame=false as default', () => {
      expect(wrapper.prop('isLibraryFrame')).toBe(false);
    });
  });

  describe('when stackframe does not have source lines', () => {
    let wrapper: ShallowWrapper;
    beforeEach(() => {
      const stackframe = { line: {} } as IStackframe;
      wrapper = shallow(<Stackframe stackframe={stackframe} />);
    });

    it('should render FrameHeading', () => {
      expect(wrapper).toMatchSnapshot();
    });

    it('should have isLibraryFrame=false as default', () => {
      expect(wrapper.prop('isLibraryFrame')).toBe(false);
    });
  });

  it('should respect isLibraryFrame', () => {
    const stackframe = { line: {} } as IStackframe;
    const wrapper = shallow(
      <Stackframe stackframe={stackframe} isLibraryFrame />
    );
    expect(wrapper.prop('isLibraryFrame')).toBe(true);
  });
});

describe('hasSourceLines', () => {
  it('should return true given a stackframe with a source context', () => {
    const stackframeMockWithSource = stacktracesMock[0];
    const result = hasSourceLines(stackframeMockWithSource as IStackframe);
    expect(result).toBe(true);
  });
  it('should return false given a stackframe with no source context', () => {
    const stackframeMockWithoutSource = stacktracesMock[1];
    const result = hasSourceLines(stackframeMockWithoutSource as IStackframe);
    expect(result).toBe(false);
  });
});
