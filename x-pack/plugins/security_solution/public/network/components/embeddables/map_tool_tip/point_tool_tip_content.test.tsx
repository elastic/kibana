/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import '../../../../common/mock/match_media';
import { getRenderedFieldValue, PointToolTipContentComponent } from './point_tool_tip_content';
import { TestProviders } from '../../../../common/mock';
import { getEmptyStringTag } from '../../../../common/components/empty_value';
import { HostDetailsLink, NetworkDetailsLink } from '../../../../common/components/links';
import {
  TooltipProperty,
  ITooltipProperty,
} from '@kbn/maps-plugin/public/classes/tooltips/tooltip_property';
import { FlowTarget } from '../../../../../common/search_strategy';

describe('PointToolTipContent', () => {
  const mockFeatureProps: ITooltipProperty[] = [
    new TooltipProperty('host.name', 'host.name', 'testPropValue'),
  ];

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <TestProviders>
        <PointToolTipContentComponent contextId={'contextId'} featureProps={mockFeatureProps} />
      </TestProviders>
    );
    expect(wrapper.find('PointToolTipContentComponent')).toMatchSnapshot();
  });

  describe('#getRenderedFieldValue', () => {
    test('it returns empty tag if value is empty', () => {
      expect(getRenderedFieldValue('host.name', '')).toStrictEqual(getEmptyStringTag());
    });

    test('it returns HostDetailsLink if field is host.name', () => {
      const value = 'suricata-ross';
      expect(getRenderedFieldValue('host.name', value)).toStrictEqual(
        <HostDetailsLink hostName={value} />
      );
    });

    test('it returns NetworkDetailsLink if field is source.ip', () => {
      const value = '127.0.0.1';
      expect(getRenderedFieldValue('source.ip', value)).toStrictEqual(
        <NetworkDetailsLink ip={value} flowTarget={FlowTarget.source} />
      );
    });

    test('it returns NetworkDetailsLink if field is destination.ip', () => {
      const value = '127.0.0.1';
      expect(getRenderedFieldValue('destination.ip', value)).toStrictEqual(
        <NetworkDetailsLink ip={value} flowTarget={FlowTarget.destination} />
      );
    });

    test('it returns nothing if field is not host.name or source/destination.ip', () => {
      const value = 'Kramerica.co';
      expect(getRenderedFieldValue('destination.domain', value)).toStrictEqual(<>{value}</>);
    });
  });
});
