/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiDarkVars } from '@kbn/ui-theme';
import { shallow } from 'enzyme';
import React from 'react';

import '../../common/mock/match_media';
import { AppMockRenderer, createAppMockRenderer, TestProviders } from '../../common/mock';
import { HeaderPage } from '.';
import { useMountAppended } from '../../utils/use_mount_appended';

jest.mock('../../common/navigation/hooks');

describe('HeaderPage', () => {
  const mount = useMountAppended();

  test('it renders', () => {
    const wrapper = shallow(
      <TestProviders>
        <HeaderPage border subtitle="Test subtitle" subtitle2="Test subtitle 2" title="Test title">
          <p>{'Test supplement'}</p>
        </HeaderPage>
      </TestProviders>
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('it renders the back link when provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage showBackButton title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('.casesHeaderPage__linkBack').first().exists()).toBe(true);
  });

  test('it DOES NOT render the back link when not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('.casesHeaderPage__linkBack').first().exists()).toBe(false);
  });

  test('it renders the first subtitle when provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage subtitle="Test subtitle" title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-page-subtitle"]').first().exists()).toBe(true);
  });

  test('it DOES NOT render the first subtitle when not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-subtitle"]').first().exists()).toBe(false);
  });

  test('it renders the second subtitle when provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage subtitle2="Test subtitle 2" title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-page-subtitle-2"]').first().exists()).toBe(true);
  });

  test('it DOES NOT render the second subtitle when not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-subtitle-2"]').first().exists()).toBe(
      false
    );
  });

  test('it renders supplements when children provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title">
          <p>{'Test supplement'}</p>
        </HeaderPage>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-page-supplements"]').first().exists()).toBe(true);
  });

  test('it DOES NOT render supplements when children not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-page-supplements"]').first().exists()).toBe(false);
  });

  test('it applies border styles when border is true', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage border title="Test title" />
      </TestProviders>
    );
    const casesHeaderPage = wrapper.find('.casesHeaderPage').first();

    expect(casesHeaderPage).toHaveStyleRule('border-bottom', euiDarkVars.euiBorderThin);
    expect(casesHeaderPage).toHaveStyleRule('padding-bottom', euiDarkVars.paddingSizes.l);
  });

  test('it DOES NOT apply border styles when border is false', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );
    const casesHeaderPage = wrapper.find('.casesHeaderPage').first();

    expect(casesHeaderPage).not.toHaveStyleRule('border-bottom', euiDarkVars.euiBorderThin);
    expect(casesHeaderPage).not.toHaveStyleRule('padding-bottom', euiDarkVars.paddingSizes.l);
  });

  describe('Badges', () => {
    let appMock: AppMockRenderer;

    beforeEach(() => {
      appMock = createAppMockRenderer();
    });

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
