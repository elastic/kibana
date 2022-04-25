/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../doc_links', () => ({
  docLinks: {
    elasticsearchGettingStarted: 'elasticsearchGettingStarted-link',
    elasticsearchCreateIndex: 'elasticsearchCreateIndex-link',
    clientsGuide: 'elasticsearchClientsGuide-link',
  },
}));
import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiSteps } from '@elastic/eui';

import { EuiLinkTo } from '../react_router_helpers';

import { IconRow } from './icon_row';

import { GettingStartedSteps } from '.';

describe('GettingStartedSteps', () => {
  let wrapper: ShallowWrapper;

  beforeAll(() => {
    wrapper = shallow(<GettingStartedSteps />);
  });

  it('renders', () => {
    const steps = wrapper
      .find(EuiSteps)
      .prop('steps')
      .map(({ title, children, status, ...rest }) => ({
        title,
        status,
        children: shallow(<div>{children}</div>),
        ...rest,
      }));

    expect(steps[0].title).toEqual('Add your documents and data to Enterprise Search');
    expect(steps[0].status).toEqual('current');
    expect(steps[0].children.find(IconRow).length).toEqual(1);

    expect(steps[1].title).toEqual('Build a search experience');
    expect(steps[1].status).toEqual('incomplete');
    expect(steps[1].children.find(EuiLinkTo).prop('to')).toEqual('/elasticsearch_guide');

    expect(steps[2].title).toEqual('Tune your search relevance');
    expect(steps[2].status).toEqual('incomplete');
  });
});
