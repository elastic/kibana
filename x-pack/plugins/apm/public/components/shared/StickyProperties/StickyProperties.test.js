/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StickyProperties } from './index';
import { mount } from 'enzyme';
import { USER_ID, REQUEST_URL_FULL } from '../../../../common/constants';
import { toJson, mockMoment } from '../../../utils/testHelpers';

describe('StickyProperties', () => {
  beforeEach(mockMoment);

  it('should render', () => {
    const stickyProperties = [
      {
        label: 'Timestamp',
        fieldName: '@timestamp',
        val: 1536405447640
      },
      {
        fieldName: REQUEST_URL_FULL,
        label: 'URL',
        val: 'https://www.elastic.co/test',
        truncated: true
      },
      {
        label: 'Request method',
        fieldName: 'context.request.method',
        val: 'GET'
      },
      {
        label: 'Handled',
        fieldName: 'error.exception.handled',
        val: 'true'
      },
      {
        label: 'User ID',
        fieldName: USER_ID,
        val: 1337
      }
    ];

    const wrapper = mount(
      <StickyProperties stickyProperties={stickyProperties} />
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
