/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StickyProperties } from './index';
import { shallow } from 'enzyme';
import { USER_ID, URL_FULL } from '../../../../common/constants';
import { mockMoment } from '../../../utils/testHelpers';

describe('StickyProperties', () => {
  beforeEach(mockMoment);

  it('should render entire component', () => {
    const stickyProperties = [
      {
        label: 'Timestamp',
        fieldName: '@timestamp',
        val: 1536405447640
      },
      {
        fieldName: URL_FULL,
        label: 'URL',
        val: 'https://www.elastic.co/test',
        truncated: true
      },
      {
        label: 'Request method',
        fieldName: 'http.request.method',
        val: 'GET'
      },
      {
        label: 'Handled',
        fieldName: 'error.exception.handled',
        val: String(true)
      },
      {
        label: 'User ID',
        fieldName: USER_ID,
        val: 1337
      }
    ];

    const wrapper = shallow(
      <StickyProperties stickyProperties={stickyProperties} />
    );

    expect(wrapper).toMatchSnapshot();
  });

  describe('values', () => {
    it('should render timestamp when fieldName is `@timestamp`', () => {
      const stickyProperties = [
        {
          label: 'My Timestamp',
          fieldName: '@timestamp',
          val: 1536405447640
        }
      ];

      const wrapper = shallow(
        <StickyProperties stickyProperties={stickyProperties} />
      ).find('TimestampValue');

      expect(wrapper).toMatchSnapshot();
    });

    it('should render numbers', () => {
      const stickyProperties = [
        {
          label: 'My Number',
          fieldName: 'myNumber',
          val: 1337
        }
      ];

      const wrapper = shallow(
        <StickyProperties stickyProperties={stickyProperties} />
      )
        .find('PropertyValue')
        .dive()
        .text();

      expect(wrapper).toEqual('1337');
    });

    it('should not stringify booleans', () => {
      const stickyProperties = [
        {
          label: 'My boolean',
          fieldName: 'myBoolean',
          val: true
        }
      ];

      const wrapper = shallow(
        <StickyProperties stickyProperties={stickyProperties} />
      )
        .find('PropertyValue')
        .dive()
        .text();

      expect(wrapper).toEqual('');
    });

    it('should render nested components', () => {
      const stickyProperties = [
        {
          label: 'My Component',
          fieldName: 'myComponent',
          val: <h1>My header</h1>
        }
      ];

      const wrapper = shallow(
        <StickyProperties stickyProperties={stickyProperties} />
      )
        .find('PropertyValue')
        .html();

      expect(wrapper).toContain(`<h1>My header</h1>`);
    });
  });
});
