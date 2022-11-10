/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiIcon, EuiButton, EuiTitle, EuiSpacer } from '@elastic/eui';

import { LoadingOverlay } from '../loading';

import { DataPanel } from './data_panel';

describe('DataPanel', () => {
  it('renders with a title and children', () => {
    const wrapper = shallow(
      <DataPanel title={<h1 data-test-subj="title">Tabula Rasa</h1>}>
        <div data-test-subj="children">Look at this graph</div>
      </DataPanel>
    );

    expect(wrapper.find('[data-test-subj="title"]').text()).toEqual('Tabula Rasa');
    expect(wrapper.find('[data-test-subj="children"]').text()).toEqual('Look at this graph');
  });

  it('conditionally renders a spacer between the header and children', () => {
    const wrapper = shallow(<DataPanel title={<h1>Test</h1>} />);

    expect(wrapper.find(EuiSpacer)).toHaveLength(0);

    wrapper.setProps({ children: 'hello world' });

    expect(wrapper.find(EuiSpacer).prop('size')).toEqual('s');

    wrapper.setProps({ filled: true });

    expect(wrapper.find(EuiSpacer).prop('size')).toEqual('l');
  });

  describe('components', () => {
    it('renders with an icon', () => {
      const wrapper = shallow(<DataPanel title={<h1>The Smoke Monster</h1>} iconType="eye" />);

      expect(wrapper.find(EuiIcon).prop('type')).toEqual('eye');
    });

    it('renders with a subtitle', () => {
      const wrapper = shallow(
        <DataPanel title={<h1>Hugo Reyes</h1>} subtitle="Hurley was typically happy-go-lucky" />
      );

      expect(wrapper.find('p').text()).toEqual('Hurley was typically happy-go-lucky');
    });

    it('renders with an icon and a subtitle', () => {
      const wrapper = shallow(
        <DataPanel
          title={<h1>Flight 815</h1>}
          iconType="package"
          subtitle="Oceanic Airlines Flight 815 was a scheduled flight from Sydney, Australia to Los Angeles, California"
        />
      );

      expect(wrapper.find(EuiIcon).prop('type')).toEqual('package');
      expect(wrapper.find('p').text()).toEqual(
        'Oceanic Airlines Flight 815 was a scheduled flight from Sydney, Australia to Los Angeles, California'
      );
    });

    it('renders with a button', () => {
      const wrapper = shallow(
        <DataPanel
          title={<h1>Board Flight 815</h1>}
          action={<EuiButton data-test-subj="action">Book flight</EuiButton>}
        />
      );

      expect(wrapper.find('[data-test-subj="action"]')).toHaveLength(1);
    });
  });

  describe('props', () => {
    it('passes titleSize to the title', () => {
      const wrapper = shallow(<DataPanel title={<h2>Test</h2>} />);

      expect(wrapper.find(EuiTitle).prop('size')).toEqual('xs'); // Default

      wrapper.setProps({ titleSize: 's' });

      expect(wrapper.find(EuiTitle).prop('size')).toEqual('s');
    });

    it('renders panel color based on filled flag', () => {
      const wrapper = shallow(<DataPanel title={<h1>Test</h1>} />);

      expect(wrapper.prop('color')).toEqual('plain');
      expect(wrapper.prop('className')).toEqual('dataPanel');

      wrapper.setProps({ filled: true });

      expect(wrapper.prop('color')).toEqual('subdued');
      expect(wrapper.prop('className')).toEqual('dataPanel dataPanel--filled');
    });

    it('renders a loading overlay based on isLoading flag', () => {
      const wrapper = shallow(<DataPanel title={<h1>Test</h1>} />);

      expect(wrapper.prop('aria-busy')).toBeFalsy();
      expect(wrapper.find(LoadingOverlay)).toHaveLength(0);

      wrapper.setProps({ isLoading: true });

      expect(wrapper.prop('aria-busy')).toBeTruthy();
      expect(wrapper.find(LoadingOverlay)).toHaveLength(1);
    });

    it('passes hasBorder', () => {
      const wrapper = shallow(<DataPanel filled title={<h1>Test</h1>} />);
      expect(wrapper.prop('hasBorder')).toBeFalsy();

      wrapper.setProps({ hasBorder: true });
      expect(wrapper.prop('hasBorder')).toBeTruthy();
    });

    it('passes class names', () => {
      const wrapper = shallow(<DataPanel title={<h1>Test</h1>} className="testing" />);

      expect(wrapper.prop('className')).toEqual('dataPanel testing');
    });

    it('passes arbitrary props', () => {
      const wrapper = shallow(<DataPanel title={<h1>Test</h1>} data-test-subj="testing" />);

      expect(wrapper.find('[data-test-subj="testing"]')).toHaveLength(1);
    });
  });
});
