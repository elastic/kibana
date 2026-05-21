/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { HighlightWrapper } from './highlight_wrapper';
import { useServiceMapSearchHighlight } from './service_map_search_context';
import { MOCK_EUI_THEME_FOR_USE_THEME } from './test_helpers';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({
      euiTheme: MOCK_EUI_THEME_FOR_USE_THEME,
      colorMode: 'LIGHT',
    }),
  };
});

jest.mock('./service_map_search_context', () => ({
  useServiceMapSearchHighlight: jest.fn(() => ({
    isSearchMatch: false,
    isActiveSearchMatch: false,
  })),
}));

const mockUseServiceMapSearchHighlight = jest.mocked(useServiceMapSearchHighlight);

function renderWrapper(props: { nodeId: string; contextHighlight?: boolean }) {
  return render(
    <HighlightWrapper {...props}>
      <div data-test-subj="child">content</div>
    </HighlightWrapper>
  );
}

function getWrapper() {
  return screen.getByTestId('child').parentElement!;
}

describe('HighlightWrapper', () => {
  afterEach(() => {
    mockUseServiceMapSearchHighlight.mockReturnValue({
      isSearchMatch: false,
      isActiveSearchMatch: false,
    });
  });

  it('renders children', () => {
    renderWrapper({ nodeId: 'node-1' });
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('calls useServiceMapSearchHighlight with the nodeId', () => {
    renderWrapper({ nodeId: 'my-node' });
    expect(mockUseServiceMapSearchHighlight).toHaveBeenCalledWith('my-node');
  });

  describe('no highlight', () => {
    it('does not set data attributes or test subject', () => {
      renderWrapper({ nodeId: 'node-1' });
      const wrapper = getWrapper();
      expect(wrapper).not.toHaveAttribute('data-search-match');
      expect(wrapper).not.toHaveAttribute('data-search-active-match');
      expect(wrapper).not.toHaveAttribute('data-test-subj');
    });
  });

  describe('context highlight', () => {
    it('sets the context highlight test subject', () => {
      renderWrapper({ nodeId: 'node-1', contextHighlight: true });
      expect(screen.getByTestId('serviceMapNodeContextHighlightFrame')).toBeInTheDocument();
    });

    it('does not set search data attributes', () => {
      renderWrapper({ nodeId: 'node-1', contextHighlight: true });
      const wrapper = getWrapper();
      expect(wrapper).not.toHaveAttribute('data-search-match');
      expect(wrapper).not.toHaveAttribute('data-search-active-match');
    });
  });

  describe('inactive search match', () => {
    beforeEach(() => {
      mockUseServiceMapSearchHighlight.mockReturnValue({
        isSearchMatch: true,
        isActiveSearchMatch: false,
      });
    });

    it('sets data-search-match but not data-search-active-match', () => {
      renderWrapper({ nodeId: 'node-1' });
      const wrapper = getWrapper();
      expect(wrapper).toHaveAttribute('data-search-match', 'true');
      expect(wrapper).not.toHaveAttribute('data-search-active-match');
    });

    it('does not set the search highlight test subject', () => {
      renderWrapper({ nodeId: 'node-1' });
      expect(screen.queryByTestId('serviceMapNodeSearchHighlightFrame')).not.toBeInTheDocument();
    });
  });

  describe('active search match', () => {
    beforeEach(() => {
      mockUseServiceMapSearchHighlight.mockReturnValue({
        isSearchMatch: true,
        isActiveSearchMatch: true,
      });
    });

    it('sets both data attributes', () => {
      renderWrapper({ nodeId: 'node-1' });
      const wrapper = getWrapper();
      expect(wrapper).toHaveAttribute('data-search-match', 'true');
      expect(wrapper).toHaveAttribute('data-search-active-match', 'true');
    });

    it('sets the search highlight test subject', () => {
      renderWrapper({ nodeId: 'node-1' });
      expect(screen.getByTestId('serviceMapNodeSearchHighlightFrame')).toBeInTheDocument();
    });
  });

  describe('search overrides context highlight', () => {
    beforeEach(() => {
      mockUseServiceMapSearchHighlight.mockReturnValue({
        isSearchMatch: true,
        isActiveSearchMatch: true,
      });
    });

    it('uses search highlight test subject instead of context', () => {
      renderWrapper({ nodeId: 'node-1', contextHighlight: true });
      expect(screen.getByTestId('serviceMapNodeSearchHighlightFrame')).toBeInTheDocument();
      expect(screen.queryByTestId('serviceMapNodeContextHighlightFrame')).not.toBeInTheDocument();
    });

    it('sets search data attributes', () => {
      renderWrapper({ nodeId: 'node-1', contextHighlight: true });
      const wrapper = getWrapper();
      expect(wrapper).toHaveAttribute('data-search-match', 'true');
      expect(wrapper).toHaveAttribute('data-search-active-match', 'true');
    });
  });
});
