/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { testImage } from '../../../../../../../dev-tools/jest/test_image';
const { toMatchImageSnapshot } = require('jest-image-snapshot');
expect.extend({ toMatchImageSnapshot });

import seriesConfig from '../../__mocks__/mock_series_config_filebeat.json';

import { mount, shallow } from 'enzyme';
import React from 'react';

import { ExplorerChartLabelBadge } from './explorer_chart_label_badge';


describe('ExplorerChartLabelBadge', () => {

  test('Render entity label badge.', () => {

    const wrapper = shallow(<ExplorerChartLabelBadge entity={seriesConfig.entityFields[0]} />);
    expect(wrapper).toMatchSnapshot();

  });

  test('Render entity label badge image.', (done) => {

    const wrapper = mount(<ExplorerChartLabelBadge entity={seriesConfig.entityFields[0]} />);

    testImage(wrapper.html(), (image) => {
      expect(image).toMatchImageSnapshot({
        customSnapshotIdentifier: 'explorer_chart_label_badge'
      });
      done();
    });
  });

});
