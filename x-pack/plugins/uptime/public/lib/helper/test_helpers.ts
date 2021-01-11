/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* global jest */

import moment from 'moment';
import { Moment } from 'moment-timezone';
import * as redux from 'react-redux';
import * as reactRouterDom from 'react-router-dom';

export function mockMoment() {
  // avoid timezone issues
  jest.spyOn(moment.prototype, 'format').mockImplementation(function (this: Moment) {
    return `Sept 4, 2020  9:31:38 AM`;
  });

  // convert relative time to absolute time to avoid timing issues
  jest.spyOn(moment.prototype, 'fromNow').mockImplementation(function (this: Moment) {
    return `15 minutes ago`;
  });
}

export function mockReduxHooks(response?: any) {
  jest.spyOn(redux, 'useDispatch').mockReturnValue(jest.fn());

  jest.spyOn(redux, 'useSelector').mockReturnValue(response);
}

export function mockReactRouterDomHooks({ useParamsResponse }: { useParamsResponse: any }) {
  jest.spyOn(reactRouterDom, 'useParams').mockReturnValue(useParamsResponse);
}
