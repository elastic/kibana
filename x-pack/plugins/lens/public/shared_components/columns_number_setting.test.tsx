/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';
import { ColumnsNumberSetting } from './columns_number_setting';

describe('Columns Number Setting', () => {
  it('should have default the columns input to 1 when no value is given', () => {
    const component = mount(<ColumnsNumberSetting isDisabled={false} isLegendOutside={false} />);
    expect(
      component.find('[data-test-subj="lens-legend-location-columns-input"]').at(0).prop('value')
    ).toEqual(1);
  });
});
