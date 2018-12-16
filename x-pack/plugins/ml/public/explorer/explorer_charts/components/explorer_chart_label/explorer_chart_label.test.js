/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import seriesConfig from '../../__mocks__/mock_series_config_filebeat.json';

import { shallow } from 'enzyme';
import React from 'react';

import { ExplorerChartLabel } from './explorer_chart_label';

const DetectorLabel = <React.Fragment>{seriesConfig.detectorLabel}</React.Fragment>;

describe('ExplorerChartLabelBadge', () => {

  test('Render the chart label in one line.', () => {

    const wrapper = shallow(
      <ExplorerChartLabel
        detectorLabel={DetectorLabel}
        entityFields={seriesConfig.entityFields}
        infoTooltip={seriesConfig.infoTooltip}
        wrapLabel={false}
      />
    );
    expect(wrapper).toMatchSnapshot();

  });

  test('Render the chart label in two lines.', () => {

    const wrapper = shallow(
      <ExplorerChartLabel
        detectorLabel={DetectorLabel}
        entityFields={seriesConfig.entityFields}
        infoTooltip={seriesConfig.infoTooltip}
        wrapLabel={true}
      />
    );
    expect(wrapper).toMatchSnapshot();

  });

});
