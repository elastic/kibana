/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { Location } from 'history';
import React from 'react';
import { RRRRenderResponse } from 'react-redux-request';
import { ErrorGroupAPIResponse } from 'x-pack/plugins/apm/server/lib/errors/get_error_group';
import { APMError } from 'x-pack/plugins/apm/typings/es_schemas/ui/APMError';
import { mockMoment } from '../../../../utils/testHelpers';
import { DetailView } from './index';

describe('DetailView', () => {
  beforeEach(() => {
    // Avoid timezone issues
    mockMoment();
  });

  it('should render empty state', () => {
    const wrapper = shallow(
      <DetailView
        errorGroup={{} as any}
        urlParams={{}}
        location={{} as Location}
      />
    );
    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('should render Discover button', () => {
    const errorGroup: RRRRenderResponse<ErrorGroupAPIResponse> = {
      args: [],
      status: 'SUCCESS',
      data: {
        occurrencesCount: 10,
        error: ({
          '@timestamp': 'myTimestamp',
          http: { request: { method: 'GET' } },
          url: { full: 'myUrl' },
          service: { name: 'myService' },
          user: { id: 'myUserId' },
          error: { exception: { handled: true } },
          transaction: { id: 'myTransactionId', sampled: true }
        } as unknown) as APMError
      }
    };
    const wrapper = shallow(
      <DetailView
        errorGroup={errorGroup}
        urlParams={{}}
        location={{} as Location}
      />
    ).find('DiscoverErrorLink');

    expect(wrapper.exists()).toBe(true);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render StickyProperties', () => {
    const errorGroup: RRRRenderResponse<ErrorGroupAPIResponse> = {
      args: [],
      status: 'SUCCESS',
      data: {
        occurrencesCount: 10,
        error: {} as APMError
      }
    };
    const wrapper = shallow(
      <DetailView
        errorGroup={errorGroup}
        urlParams={{}}
        location={{} as Location}
      />
    ).find('StickyErrorProperties');

    expect(wrapper.exists()).toBe(true);
  });

  it('should render tabs', () => {
    const errorGroup: RRRRenderResponse<ErrorGroupAPIResponse> = {
      args: [],
      status: 'SUCCESS',
      data: {
        occurrencesCount: 10,
        error: ({
          '@timestamp': 'myTimestamp',
          service: {},
          user: {}
        } as unknown) as APMError
      }
    };
    const wrapper = shallow(
      <DetailView
        errorGroup={errorGroup}
        urlParams={{}}
        location={{} as Location}
      />
    ).find('EuiTabs');

    expect(wrapper.exists()).toBe(true);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render TabContent', () => {
    const errorGroup: RRRRenderResponse<ErrorGroupAPIResponse> = {
      args: [],
      status: 'SUCCESS',
      data: {
        occurrencesCount: 10,
        error: ({
          '@timestamp': 'myTimestamp',
          context: {}
        } as unknown) as APMError
      }
    };
    const wrapper = shallow(
      <DetailView
        errorGroup={errorGroup}
        urlParams={{}}
        location={{} as Location}
      />
    ).find('TabContent');

    expect(wrapper.exists()).toBe(true);
    expect(wrapper).toMatchSnapshot();
  });
});
