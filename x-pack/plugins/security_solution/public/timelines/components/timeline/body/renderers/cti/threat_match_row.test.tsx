/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../../../common/mock';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';
import { ThreatMatchRowProps, ThreatMatchRowView } from './threat_match_row';

jest.mock('../../../../../../common/lib/kibana');

describe('ThreatMatchRowView', () => {
  const mount = useMountAppended();

  it('renders an indicator match row', () => {
    const wrapper = shallow(
      <ThreatMatchRowView
        contextId="contextId"
        eventId="eventId"
        feedName="feedName"
        indicatorReference="http://example.com"
        indicatorType="domain"
        sourceField="host.name"
        sourceValue="http://elastic.co"
      />
    );

    expect(wrapper.find('[data-test-subj="threat-match-row"]').exists()).toEqual(true);
  });

  it('matches the registered snapshot', () => {
    const wrapper = shallow(
      <ThreatMatchRowView
        contextId="contextId"
        eventId="eventId"
        feedName="feedName"
        indicatorReference="http://example.com"
        indicatorType="domain"
        sourceField="host.name"
        sourceValue="http://elastic.co"
      />
    );

    expect(wrapper).toMatchSnapshot();
  });

  describe('field rendering', () => {
    let baseProps: ThreatMatchRowProps;
    const render = (props: ThreatMatchRowProps) =>
      mount(
        <TestProviders>
          <ThreatMatchRowView {...props} />
        </TestProviders>
      );

    beforeEach(() => {
      baseProps = {
        contextId: 'contextId',
        eventId: 'eventId',
        feedName: 'feedName',
        indicatorReference: 'http://example.com',
        indicatorType: 'domain',
        sourceField: 'host.name',
        sourceValue: 'http://elastic.co',
      };
    });

    it('renders the match field', () => {
      const wrapper = render(baseProps);
      const matchField = wrapper.find('[data-test-subj="threat-match-details-source-field"]');
      expect(matchField.props()).toEqual(
        expect.objectContaining({
          value: 'host.name',
        })
      );
    });

    it('renders the match value', () => {
      const wrapper = render(baseProps);
      const matchValue = wrapper.find('[data-test-subj="threat-match-details-source-value"]');
      expect(matchValue.props()).toEqual(
        expect.objectContaining({
          field: 'host.name',
          value: 'http://elastic.co',
        })
      );
    });

    it('renders the indicator type, if present', () => {
      const wrapper = render(baseProps);
      const indicatorType = wrapper.find(
        '[data-test-subj="threat-match-indicator-details-indicator-type"]'
      );
      expect(indicatorType.props()).toEqual(
        expect.objectContaining({
          value: 'domain',
        })
      );
    });

    it('does not render the indicator type, if absent', () => {
      const wrapper = render({
        ...baseProps,
        indicatorType: undefined,
      });
      const indicatorType = wrapper.find(
        '[data-test-subj="threat-match-indicator-details-indicator-type"]'
      );
      expect(indicatorType.exists()).toBeFalsy();
    });

    it('renders the feed name, if present', () => {
      const wrapper = render(baseProps);
      const feedName = wrapper.find(
        '[data-test-subj="threat-match-indicator-details-indicator-feedName"]'
      );
      expect(feedName.props()).toEqual(
        expect.objectContaining({
          value: 'feedName',
        })
      );
    });

    it('does not render the indicator provider, if absent', () => {
      const wrapper = render({
        ...baseProps,
        feedName: undefined,
      });
      const indicatorProvider = wrapper.find(
        '[data-test-subj="threat-match-indicator-details-indicator-feedName"]'
      );
      expect(indicatorProvider.exists()).toBeFalsy();
    });

    it('renders the indicator reference, if present', () => {
      const wrapper = render(baseProps);
      const indicatorReference = wrapper.find(
        '[data-test-subj="threat-match-indicator-details-indicator-reference"]'
      );
      expect(indicatorReference.props()).toEqual(
        expect.objectContaining({
          value: 'http://example.com',
        })
      );
    });

    it('does not render the indicator reference, if absent', () => {
      const wrapper = render({
        ...baseProps,
        indicatorReference: undefined,
      });
      const indicatorReference = wrapper.find(
        '[data-test-subj="threat-match-indicator-details-indicator-reference"]'
      );
      expect(indicatorReference.exists()).toBeFalsy();
    });
  });
});
