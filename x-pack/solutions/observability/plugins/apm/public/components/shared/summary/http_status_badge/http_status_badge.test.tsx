/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { HttpStatusBadge } from '.';
import { renderHook } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';

describe('HttpStatusBadge', () => {
  describe('render', () => {
    describe('with status code 100', () => {
      it('renders with neutral color', () => {
        const wrapper = mount(<HttpStatusBadge status={100} />);
        const { result } = renderHook(() => useEuiTheme());
        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          result.current.euiTheme.colors.vis.euiColorVisGrey0
        );
      });
    });

    describe('with status code 200', () => {
      it('renders with success color', () => {
        const wrapper = mount(<HttpStatusBadge status={200} />);
        const { result } = renderHook(() => useEuiTheme());
        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          result.current.euiTheme.colors.vis.euiColorVisSuccess0
        );
      });
    });

    describe('with status code 301', () => {
      it('renders with neutral color', () => {
        const wrapper = mount(<HttpStatusBadge status={301} />);
        const { result } = renderHook(() => useEuiTheme());
        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          result.current.euiTheme.colors.vis.euiColorVisGrey0
        );
      });
    });

    describe('with status code 404', () => {
      it('renders with warning color', () => {
        const wrapper = mount(<HttpStatusBadge status={404} />);
        const { result } = renderHook(() => useEuiTheme());
        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          result.current.euiTheme.colors.vis.euiColorVisWarning0
        );
      });
    });

    describe('with status code 502', () => {
      it('renders with error color', () => {
        const wrapper = mount(<HttpStatusBadge status={502} />);
        const { result } = renderHook(() => useEuiTheme());
        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual(
          result.current.euiTheme.colors.vis.euiColorVisDanger0
        );
      });
    });

    describe('with other status code', () => {
      it('renders with default color', () => {
        const wrapper = mount(<HttpStatusBadge status={700} />);

        expect(wrapper.find('HttpStatusBadge EuiBadge').prop('color')).toEqual('default');
      });
    });
  });
});
