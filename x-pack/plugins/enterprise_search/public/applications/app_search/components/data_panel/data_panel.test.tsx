/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton } from '@elastic/eui';

import { DataPanel } from './data_panel';

describe('DataPanel', () => {
  it('Renders without an icon or a subtitle', () => {
    const wrapper = shallow(<DataPanel title="Tabula Rasa">Look at this graph</DataPanel>);

    expect(wrapper.find('[data-test-subj="dataPanelTitle"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="dataPanelIcon"]')).toHaveLength(0);
    expect(wrapper.find('[data-test-subj="dataPanelSubtitle"]')).toHaveLength(0);
    expect(wrapper.find('[data-test-subj="dataPanelAction"]')).toHaveLength(0);
  });

  it('Renders with an icon, without a subtitle', () => {
    const wrapper = shallow(
      <DataPanel title="The Smoke Monster" iconType="eye">
        Look at this graph
      </DataPanel>
    );

    expect(wrapper.find('[data-test-subj="dataPanelTitle"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="dataPanelIcon"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="dataPanelSubtitle"]')).toHaveLength(0);
    expect(wrapper.find('[data-test-subj="dataPanelAction"]')).toHaveLength(0);
  });

  it('Renders with an icon and a subtitle', () => {
    const wrapper = shallow(
      <DataPanel
        title="Flight 815"
        iconType="package"
        subtitle="Oceanic Airlines Flight 815 was a scheduled flight from Sydney, Australia to Los Angeles, California"
      />
    );

    expect(wrapper.find('[data-test-subj="dataPanelTitle"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="dataPanelSubtitle"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="dataPanelIcon"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="dataPanelAction"]')).toHaveLength(0);
  });

  it('Renders without an icon, with a subtitle', () => {
    const wrapper = shallow(
      <DataPanel title="Hugo Reyes" subtitle="Hurley was typically happy-go-lucky" />
    );
    expect(wrapper.find('[data-test-subj="dataPanelTitle"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="dataPanelIcon"]')).toHaveLength(0);
    expect(wrapper.find('[data-test-subj="dataPanelSubtitle"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="dataPanelAction"]')).toHaveLength(0);
  });

  it('Renders with a button', () => {
    const wrapper = shallow(
      <DataPanel title="Board Flight 815" action={<EuiButton>Book flight</EuiButton>} />
    );
    expect(wrapper.find('[data-test-subj="dataPanelTitle"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="dataPanelIcon"]')).toHaveLength(0);
    expect(wrapper.find('[data-test-subj="dataPanelSubtitle"]')).toHaveLength(0);
    expect(wrapper.find('[data-test-subj="dataPanelAction"]')).toHaveLength(1);
  });
});
