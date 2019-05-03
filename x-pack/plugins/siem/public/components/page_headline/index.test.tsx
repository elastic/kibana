/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { get } from 'lodash/fp';
import * as React from 'react';

import { PageHeadlineComponents } from '.';

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';
const getMockProps = (routePath: string) => {
  const location = {
    pathname: routePath,
    search: '',
    state: '',
    hash: '',
  };
  return {
    location,
    match: {
      isExact: true,
      params: {},
      path: '',
      url: '',
    },
    history: {
      length: 2,
      location,
      action: pop,
      push: jest.fn(),
      replace: jest.fn(),
      go: jest.fn(),
      goBack: jest.fn(),
      goForward: jest.fn(),
      block: jest.fn(),
      createHref: jest.fn(),
      listen: jest.fn(),
    },
  };
};

describe('SIEM Page Headline', () => {
  test('Renders hosts headline', () => {
    const mockProps = getMockProps('/hosts');
    const wrapper = shallow(<PageHeadlineComponents {...mockProps} />);
    const pageHeadline = wrapper
      .dive()
      .find('[data-test-subj="page_headline"]')
      .props().title;

    expect(get('props.defaultMessage', pageHeadline)).toEqual('Hosts');
  });

  test('Renders overview headline', () => {
    const mockProps = getMockProps('/overview');
    const wrapper = shallow(<PageHeadlineComponents {...mockProps} />);
    const pageHeadline = wrapper
      .dive()
      .find('[data-test-subj="page_headline"]')
      .props().title;

    expect(get('props.defaultMessage', pageHeadline)).toEqual('SIEM');
  });

  test('Renders network headline', () => {
    const mockProps = getMockProps('/network');
    const wrapper = shallow(<PageHeadlineComponents {...mockProps} />);
    const pageHeadline = wrapper
      .dive()
      .find('[data-test-subj="page_headline"]')
      .props().title;

    expect(get('props.defaultMessage', pageHeadline)).toEqual('Network');
  });

  test('Renders timelines headline', () => {
    const mockProps = getMockProps('/timelines');
    const wrapper = shallow(<PageHeadlineComponents {...mockProps} />);
    const pageHeadline = wrapper
      .dive()
      .find('[data-test-subj="page_headline"]')
      .props().title;

    expect(get('props.defaultMessage', pageHeadline)).toEqual('Timelines');
  });

  test('Renders host details headline', () => {
    const mockProps = getMockProps('/hosts/siem-kibana');
    const wrapper = shallow(<PageHeadlineComponents {...mockProps} />);
    const pageHeadline = wrapper
      .dive()
      .find('[data-test-subj="page_headline"]')
      .props().title;

    expect(pageHeadline).toEqual('siem-kibana');
  });

  test('Renders ip overview headline', () => {
    const mockProps = getMockProps('/network/ip/123.45.678.10');
    const wrapper = shallow(<PageHeadlineComponents {...mockProps} />);
    const pageHeadline = wrapper
      .dive()
      .find('[data-test-subj="page_headline"]')
      .props().title;

    expect(pageHeadline).toEqual('123.45.678.10');
  });

  test('Wacky path renders overview headline', () => {
    const mockProps = getMockProps('/boogity/woogity');
    const wrapper = shallow(<PageHeadlineComponents {...mockProps} />);
    const pageHeadline = wrapper
      .dive()
      .find('[data-test-subj="page_headline"]')
      .props().title;

    expect(get('props.defaultMessage', pageHeadline)).toEqual('SIEM');
  });
});
