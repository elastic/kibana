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
  it('should display only body if not header props used', () => {
    expect(
      mount(
        <EuiThemeProvider>
          <PageView>body content</PageView>
        </EuiThemeProvider>
      )
    ).toMatchSnapshot();
  });
  it('should display header left and right', () => {
    expect(
      mount(
        <EuiThemeProvider>
          <PageView headerLeft="page title" headerRight="right side actions">
            body content
          </PageView>
        </EuiThemeProvider>
      )
    ).toMatchSnapshot();
  });
  it('should display only header left', () => {
    expect(
      mount(
        <EuiThemeProvider>
          <PageView headerLeft="page title">body content</PageView>
        </EuiThemeProvider>
      )
    ).toMatchSnapshot();
  });
  it('should display only header right but include an empty left side', () => {
    expect(
      mount(
        <EuiThemeProvider>
          <PageView headerRight="right side actions">body content</PageView>
        </EuiThemeProvider>
      )
    ).toMatchSnapshot();
  });
  it(`should use custom element for header left and not wrap in EuiTitle`, () => {
    expect(
      mount(
        <EuiThemeProvider>
          <PageView headerLeft={<p>title here</p>}>body content</PageView>
        </EuiThemeProvider>
      )
    ).toMatchSnapshot();
  });
  it('should display body header wrapped in EuiTitle', () => {
    expect(
      mount(
        <EuiThemeProvider>
          <PageView bodyHeader="body header">body content</PageView>
        </EuiThemeProvider>
      )
    ).toMatchSnapshot();
  });
  it('should display body header custom element', () => {
    expect(
      mount(
        <EuiThemeProvider>
          <PageView bodyHeader={<p>body header</p>}>body content</PageView>
        </EuiThemeProvider>
      )
    ).toMatchSnapshot();
  });
  it('should pass through EuiPage props', () => {
    expect(
      mount(
        <EuiThemeProvider>
          <PageView
            restrictWidth="1000"
            className="test-class-name-here"
            aria-label="test-aria-label-here"
            data-test-subj="test-data-test-subj-here"
          >
            body content
          </PageView>
        </EuiThemeProvider>
      )
    ).toMatchSnapshot();
  });
});
