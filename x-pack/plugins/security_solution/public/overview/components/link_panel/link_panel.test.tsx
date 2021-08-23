/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { TestProviders } from '../../../common/mock';
import { LinkPanel } from './link_panel';

describe('LinkPanel', () => {
  const defaultProps = {
    button: <div className={'test-button'} />,
    infoPanel: <div className={'info-panel'} />,
    listItems: [
      { title: 'a', count: 2, path: '' },
      { title: 'b', count: 1, path: '/test' },
    ],
    panelTitle: 'test-panel-title',
    splitPanel: <div className={'split-panel'} />,
    subtitle: <div className={'subtitle'} />,
    dataTestSubj: 'test-subj',
    columns: [
      { name: 'title', field: 'title', sortable: true },
      {
        name: 'count',
        field: 'count',
      },
    ],
  };

  it('renders expected children', () => {
    const wrapper = mount(
      <TestProviders>
        <LinkPanel {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.exists('[data-test-subj="test-subj"] table')).toEqual(true);
    expect(wrapper.exists('.test-button')).toEqual(true);
    expect(wrapper.exists('.info-panel')).toEqual(true);
    expect(wrapper.exists('.split-panel')).toEqual(true);
  });
});
