/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, TestProviders } from '../../common/mock';
import { HeaderPage } from '.';
import { useMountAppended } from '../../utils/use_mount_appended';

jest.mock('../../common/navigation/hooks');

describe('HeaderPage', () => {
  const mount = useMountAppended();
  let appMock: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMock = createAppMockRenderer();
  });

  it('renders', () => {
    const result = appMock.render(
      <TestProviders>
        <HeaderPage border title="Test title">
          <p>{'Test supplement'}</p>
        </HeaderPage>
      </TestProviders>
    );

    expect(result.getByText('Test title')).toBeInTheDocument();
    expect(result.getByText('Test supplement')).toBeInTheDocument();
  });

  it('renders the back link when provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage showBackButton title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('.casesHeaderPage__linkBack').first().exists()).toBe(true);
  });

  it('DOES NOT render the back link when not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('.casesHeaderPage__linkBack').first().exists()).toBe(false);
  });

  it('renders supplements when children provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title">
          <p>{'Test supplement'}</p>
        </HeaderPage>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-page-supplements"]').first().exists()).toBe(true);
  });

  it('DOES NOT render supplements when children not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-page-supplements"]').first().exists()).toBe(false);
  });

  describe('Badges', () => {
    it('does not render the badge if the release is ga', () => {
      const renderResult = appMock.render(<HeaderPage title="Test title" />);

      expect(renderResult.getByText('Test title')).toBeInTheDocument();
      expect(renderResult.queryByText('Beta')).toBeFalsy();
      expect(renderResult.queryByText('Technical preview')).toBeFalsy();
    });

    it('does render the beta badge', () => {
      appMock = createAppMockRenderer({ releasePhase: 'beta' });
      const renderResult = appMock.render(<HeaderPage title="Test title" />);

      expect(renderResult.getByText('Test title')).toBeInTheDocument();
      expect(renderResult.getByText('Beta')).toBeInTheDocument();
    });

    it('does render the experimental badge', () => {
      appMock = createAppMockRenderer({ releasePhase: 'experimental' });
      const renderResult = appMock.render(<HeaderPage title="Test title" />);

      expect(renderResult.getByText('Test title')).toBeInTheDocument();
      expect(renderResult.getByText('Technical preview')).toBeInTheDocument();
    });
  });
});
