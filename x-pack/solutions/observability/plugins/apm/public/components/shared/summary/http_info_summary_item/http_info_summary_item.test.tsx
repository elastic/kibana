/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { HttpInfoSummaryItem } from '.';
import * as exampleTransactions from '../__fixtures__/transactions';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';

describe('HttpInfoSummaryItem', () => {
  describe('render', () => {
    const transaction = exampleTransactions.httpOk;
    const url = 'https://example.com';
    const method = 'get';
    const props = { transaction, url, method, status: 100 };

    it('renders', () => {
      expect(() =>
        shallow(<HttpInfoSummaryItem {...props} />, {
          wrappingComponent: EuiThemeProvider,
        })
      ).not.toThrowError();
    });

    it('renders empty component if no url is provided', () => {
      const component = shallow(<HttpInfoSummaryItem url="" />, {
        wrappingComponent: EuiThemeProvider,
      });
      expect(component.isEmptyRender()).toBeTruthy();
    });

    describe('with status code 100', () => {
      it('shows a success color', () => {
        const wrapper = mount(<HttpInfoSummaryItem {...props} />, {
          wrappingComponent: EuiThemeProvider,
        });

        expect(wrapper.find('HttpStatusBadge').prop('status')).toEqual(100);
      });
    });

    describe('with status code 200', () => {
      it('shows a success color', () => {
        const p = { ...props, status: 200 };
        const wrapper = mount(<HttpInfoSummaryItem {...p} />, {
          wrappingComponent: EuiThemeProvider,
        });

        expect(wrapper.find('HttpStatusBadge').prop('status')).toEqual(200);
      });
    });

    describe('with status code 301', () => {
      it('shows a warning color', () => {
        const p = { ...props, status: 301 };

        const wrapper = mount(<HttpInfoSummaryItem {...p} />, {
          wrappingComponent: EuiThemeProvider,
        });

        expect(wrapper.find('HttpStatusBadge').prop('status')).toEqual(301);
      });
    });

    describe('with status code 404', () => {
      it('shows a error color', () => {
        const p = { ...props, status: 404 };

        const wrapper = mount(<HttpInfoSummaryItem {...p} />, {
          wrappingComponent: EuiThemeProvider,
        });

        expect(wrapper.find('HttpStatusBadge').prop('status')).toEqual(404);
      });
    });

    describe('with status code 502', () => {
      it('shows a error color', () => {
        const p = { ...props, status: 502 };

        const wrapper = mount(<HttpInfoSummaryItem {...p} />, {
          wrappingComponent: EuiThemeProvider,
        });

        expect(wrapper.find('HttpStatusBadge').prop('status')).toEqual(502);
      });
    });

    describe('with some other status code', () => {
      it('shows the default color', () => {
        const p = { ...props, status: 700 };

        const wrapper = mount(<HttpInfoSummaryItem {...p} />, {
          wrappingComponent: EuiThemeProvider,
        });

        expect(wrapper.find('HttpStatusBadge').prop('status')).toEqual(700);
      });
    });
  });
});
