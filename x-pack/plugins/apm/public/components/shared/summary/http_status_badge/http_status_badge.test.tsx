/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { HttpStatusBadge } from '.';
import {
  successColor,
  neutralColor,
  warningColor,
  errorColor,
} from '../../../../utils/http_status_code_to_color';

describe('HttpStatusBadge', () => {
  describe('render', () => {
    describe('with status code 100', () => {
      it('renders with neutral color', () => {
        const wrapper = mount(<HttpStatusBadge status={100} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          neutralColor
        );
      });
    });

    describe('with status code 200', () => {
      it('renders with success color', () => {
        const wrapper = mount(<HttpStatusBadge status={200} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          successColor
        );
      });
    });

    describe('with status code 301', () => {
      it('renders with neutral color', () => {
        const wrapper = mount(<HttpStatusBadge status={301} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          neutralColor
        );
      });
    });

    describe('with status code 404', () => {
      it('renders with warning color', () => {
        const wrapper = mount(<HttpStatusBadge status={404} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          warningColor
        );
      });
    });

    describe('with status code 502', () => {
      it('renders with error color', () => {
        const wrapper = mount(<HttpStatusBadge status={502} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          errorColor
        );
      });
    });

    describe('with other status code', () => {
      it('renders with default color', () => {
        const wrapper = mount(<HttpStatusBadge status={700} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          'default'
        );
      });
    });
  });
});
