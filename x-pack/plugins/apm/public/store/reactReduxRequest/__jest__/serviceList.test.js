/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as rest from '../../../services/rest/apm/services';
import { getServiceList, ServiceListRequest } from '../serviceList';
import { mountWithStore } from '../../../utils/testHelpers';

describe('serviceList', () => {
  describe('getServiceList', () => {
    it('should return default value when empty', () => {
      const state = { reactReduxRequest: {}, sorting: { service: {} } };
      expect(getServiceList(state)).toEqual({ data: [] });
    });

    it('should return serviceList when not empty', () => {
      const state = {
        reactReduxRequest: { serviceList: { data: [{ foo: 'bar' }] } },
        sorting: { service: {} }
      };
      expect(getServiceList(state)).toEqual({ data: [{ foo: 'bar' }] });
    });
  });

  describe('ServiceListRequest', () => {
    let loadSpy;
    let renderSpy;
    let wrapper;

    beforeEach(() => {
      const state = {
        reactReduxRequest: {
          serviceList: { status: 'my-status', data: [{ foo: 'bar' }] }
        },
        sorting: { service: {} }
      };

      loadSpy = jest.spyOn(rest, 'loadServiceList').mockReturnValue();
      renderSpy = jest.fn().mockReturnValue(<div>rendered</div>);

      wrapper = mountWithStore(
        <ServiceListRequest
          urlParams={{ start: 'myStart', end: 'myEnd' }}
          render={renderSpy}
        />,
        state
      );
    });

    it('should call render method', () => {
      expect(renderSpy).toHaveBeenCalledWith({
        data: [{ foo: 'bar' }],
        status: 'my-status'
      });
    });

    it('should call "loadServiceList"', () => {
      expect(loadSpy).toHaveBeenCalledWith({
        start: 'myStart',
        end: 'myEnd'
      });
    });

    it('should render component', () => {
      expect(wrapper.html()).toEqual('<div>rendered</div>');
    });
  });
});
