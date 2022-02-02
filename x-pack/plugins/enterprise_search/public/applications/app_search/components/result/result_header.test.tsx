/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBadge } from '@elastic/eui';

import { mountWithIntl } from '../../../test_helpers';

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
    showClick: false,
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

  it('renders position if one is passed in', () => {
    const wrapper = mountWithIntl(<ResultHeader {...props} resultPosition={5} />);

    const badge = wrapper.find(EuiBadge);
    expect(badge.text()).toContain('#5');
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

  describe('clicks', () => {
    it('renders clicks if showClick is true', () => {
      const wrapper = shallow(<ResultHeader {...props} showClick />);
      expect(wrapper.find('[data-test-subj="ResultClicks"]').exists()).toBe(true);
    });

    it(' does not render clicks if showClick is false', () => {
      const wrapper = shallow(<ResultHeader {...props} showClick={false} />);
      expect(wrapper.find('[data-test-subj="ResultClicks"]').exists()).toBe(false);
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
