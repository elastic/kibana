/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { ResultActions } from './result_actions';
import { ResultHeader } from './result_header';

describe('ResultHeader', () => {
  const resultMeta = {
    id: '1',
    score: 100,
    engine: 'my-engine',
  };
  const props = {
    showScore: false,
    isMetaEngine: false,
    resultMeta,
    actions: [],
  };

  it('renders', () => {
    const wrapper = shallow(<ResultHeader {...props} />);
    expect(wrapper.isEmptyRender()).toBe(false);
  });

  it('always renders an id', () => {
    const wrapper = shallow(<ResultHeader {...props} />);
    expect(wrapper.find('[data-test-subj="ResultId"]').prop('value')).toEqual('1');
    expect(wrapper.find('[data-test-subj="ResultId"]').prop('href')).toBeUndefined();
  });

  it('renders id as a link if a documentLink has been passed', () => {
    const wrapper = shallow(
      <ResultHeader {...props} documentLink="/engines/my-engine/documents/1" />
    );
    expect(wrapper.find('[data-test-subj="ResultId"]').prop('value')).toEqual('1');
    expect(wrapper.find('[data-test-subj="ResultId"]').prop('href')).toEqual(
      '/engines/my-engine/documents/1'
    );
  });

  describe('score', () => {
    it('renders score if showScore is true ', () => {
      const wrapper = shallow(<ResultHeader {...props} showScore />);
      expect(wrapper.find('[data-test-subj="ResultScore"]').prop('value')).toEqual(100);
    });

    it('does not render score if showScore is false', () => {
      const wrapper = shallow(<ResultHeader {...props} showScore={false} />);
      expect(wrapper.find('[data-test-subj="ResultScore"]').exists()).toBe(false);
    });
  });

  describe('engine', () => {
    it('renders engine name if this is a meta engine', () => {
      const wrapper = shallow(<ResultHeader {...props} isMetaEngine />);
      expect(wrapper.find('[data-test-subj="ResultEngine"]').prop('value')).toBe('my-engine');
    });

    it('does not render an engine if this is not a meta engine', () => {
      const wrapper = shallow(<ResultHeader {...props} isMetaEngine={false} />);
      expect(wrapper.find('[data-test-subj="ResultEngine"]').exists()).toBe(false);
    });
  });

  describe('actions', () => {
    const actions = [{ title: 'View document', onClick: () => {}, iconType: 'eye' }];

    it('renders ResultActions if actions have been passed', () => {
      const wrapper = shallow(<ResultHeader {...props} actions={actions} />);
      expect(wrapper.find(ResultActions).exists()).toBe(true);
    });

    it('does not render ResultActions if no actions are passed', () => {
      const wrapper = shallow(<ResultHeader {...props} actions={[]} />);
      expect(wrapper.find(ResultActions).exists()).toBe(false);
    });
  });
});
