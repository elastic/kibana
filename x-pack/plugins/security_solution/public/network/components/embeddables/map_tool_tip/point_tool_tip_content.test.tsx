/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { getRenderedFieldValue, PointToolTipContentComponent } from './point_tool_tip_content';
import { TestProviders } from '../../../../common/mock';
import { getEmptyStringTag } from '../../../../common/components/empty_value';
import { HostDetailsLink, IPDetailsLink } from '../../../../common/components/links';
import { FlowTarget } from '../../../../graphql/types';
import {
  TooltipProperty,
  ITooltipProperty,
} from '../../../../../../maps/public/classes/tooltips/tooltip_property';

describe('PointToolTipContent', () => {
  const mockFeatureProps: ITooltipProperty[] = [
    new TooltipProperty('host.name', 'host.name', 'testPropValue'),
  ];

  test('renders correctly against snapshot', () => {
    const closeTooltip = jest.fn();

    const wrapper = shallow(
      <TestProviders>
        <PointToolTipContentComponent
          contextId={'contextId'}
          featureProps={mockFeatureProps}
          closeTooltip={closeTooltip}
        />
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

    test('it returns IPDetailsLink if field is source.ip', () => {
      const value = '127.0.0.1';
      expect(getRenderedFieldValue('source.ip', value)).toStrictEqual(
        <IPDetailsLink ip={value} flowTarget={FlowTarget.source} />
      );
    });

    test('it returns IPDetailsLink if field is destination.ip', () => {
      const value = '127.0.0.1';
      expect(getRenderedFieldValue('destination.ip', value)).toStrictEqual(
        <IPDetailsLink ip={value} flowTarget={FlowTarget.destination} />
      );
    });

    test('it returns nothing if field is not host.name or source/destination.ip', () => {
      const value = 'Kramerica.co';
      expect(getRenderedFieldValue('destination.domain', value)).toStrictEqual(<>{value}</>);
    });
  });
});
