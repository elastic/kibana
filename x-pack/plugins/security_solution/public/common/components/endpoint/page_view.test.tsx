/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { PageView } from './page_view';
import { EuiThemeProvider } from '../../../../../../legacy/common/eui_styled_components';

describe('PageView component', () => {
  const render = (ui: Parameters<typeof mount>[0]) =>
    mount(ui, { wrappingComponent: EuiThemeProvider });

  it('should display only body if not header props used', () => {
    expect(render(<PageView viewType="list">{'body content'}</PageView>)).toMatchSnapshot();
  });
  it('should display header left and right', () => {
    expect(
      render(
        <PageView viewType="list" headerLeft="page title" headerRight="right side actions">
          {'body content'}
        </PageView>
      )
    ).toMatchSnapshot();
  });
  it('should display only header left', () => {
    expect(
      render(
        <PageView viewType="list" headerLeft="page title">
          {'body content'}
        </PageView>
      )
    ).toMatchSnapshot();
  });
  it('should display only header right but include an empty left side', () => {
    expect(
      render(
        <PageView viewType="list" headerRight="right side actions">
          {'body content'}
        </PageView>
      )
    ).toMatchSnapshot();
  });
  it(`should use custom element for header left and not wrap in EuiTitle`, () => {
    expect(
      render(
        <PageView viewType="list" headerLeft={<p>{'title here'}</p>}>
          {'body content'}
        </PageView>
      )
    ).toMatchSnapshot();
  });
  it('should display body header wrapped in EuiTitle', () => {
    expect(
      render(
        <PageView viewType="list" bodyHeader="body header">
          {'body content'}
        </PageView>
      )
    ).toMatchSnapshot();
  });
  it('should display body header custom element', () => {
    expect(
      render(
        <PageView viewType="list" bodyHeader={<p>{'body header'}</p>}>
          {'body content'}
        </PageView>
      )
    ).toMatchSnapshot();
  });
  it('should pass through EuiPage props', () => {
    expect(
      render(
        <PageView
          viewType="list"
          restrictWidth="1000"
          className="test-class-name-here"
          aria-label="test-aria-label-here"
          data-test-subj="test-data-test-subj-here"
        >
          {'body content'}
        </PageView>
      )
    ).toMatchSnapshot();
  });
});
