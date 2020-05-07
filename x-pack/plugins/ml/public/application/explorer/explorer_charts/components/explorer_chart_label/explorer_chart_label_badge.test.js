/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import seriesConfig from '../../__mocks__/mock_series_config_filebeat.json';

import { shallow } from 'enzyme';
import React from 'react';

import { ExplorerChartLabelBadge } from './explorer_chart_label_badge';

describe('ExplorerChartLabelBadge', () => {
  test('Render entity label badge.', () => {
    const wrapper = shallow(<ExplorerChartLabelBadge entity={seriesConfig.entityFields[0]} />);
    expect(wrapper).toMatchSnapshot();
  });
});
