/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EntityPanel } from './entity_panel';
import {
  ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID,
  ENTITY_PANEL_HEADER_TEST_ID,
  ENTITY_PANEL_HEADER_LEFT_SECTION_TEST_ID,
  ENTITY_PANEL_HEADER_RIGHT_SECTION_TEST_ID,
  ENTITY_PANEL_CONTENT_TEST_ID,
} from './test_ids';
import { ThemeProvider } from 'styled-components';
import { getMockTheme } from '../../../common/lib/kibana/kibana_react.mock';

const mockTheme = getMockTheme({ eui: { euiColorMediumShade: '#ece' } });
const ENTITY_PANEL_TEST_ID = 'entityPanel';
const defaultProps = {
  title: 'test',
  iconType: 'storage',
  'data-test-subj': ENTITY_PANEL_TEST_ID,
};
const children = <p>{'test content'}</p>;

describe('<EntityPanel />', () => {
  describe('panel is not expandable by default', () => {
    it('should render non-expandable panel by default', () => {
      const { getByTestId, queryByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <EntityPanel {...defaultProps}>{children}</EntityPanel>
        </ThemeProvider>
      );
      expect(getByTestId(ENTITY_PANEL_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_HEADER_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).toHaveTextContent('test content');
      expect(queryByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    });

    it('should only render left section of panel header when headerContent is not passed', () => {
      const { getByTestId, queryByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <EntityPanel {...defaultProps}>{children}</EntityPanel>
        </ThemeProvider>
      );
      expect(getByTestId(ENTITY_PANEL_HEADER_LEFT_SECTION_TEST_ID)).toHaveTextContent('test');
      expect(queryByTestId(ENTITY_PANEL_HEADER_RIGHT_SECTION_TEST_ID)).not.toBeInTheDocument();
    });

    it('should render header properly when headerContent is available', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <EntityPanel {...defaultProps} headerContent={<>{'test header content'}</>}>
            {children}
          </EntityPanel>
        </ThemeProvider>
      );
      expect(getByTestId(ENTITY_PANEL_HEADER_LEFT_SECTION_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_HEADER_RIGHT_SECTION_TEST_ID)).toBeInTheDocument();
    });

    it('should not render content when content is null', () => {
      const { queryByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <EntityPanel {...defaultProps} />
        </ThemeProvider>
      );

      expect(queryByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    });
  });

  describe('panel is expandable', () => {
    it('should render panel with toggle and collapsed by default', () => {
      const { getByTestId, queryByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <EntityPanel {...defaultProps} expandable={true}>
            {children}
          </EntityPanel>
        </ThemeProvider>
      );
      expect(getByTestId(ENTITY_PANEL_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_HEADER_TEST_ID)).toHaveTextContent('test');
      expect(queryByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).not.toBeInTheDocument();
    });

    it('click toggle button should expand the panel', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <EntityPanel {...defaultProps} expandable={true}>
            {children}
          </EntityPanel>
        </ThemeProvider>
      );

      const toggle = getByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID);
      expect(toggle.firstChild).toHaveAttribute('data-euiicon-type', 'arrowRight');
      toggle.click();

      expect(getByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).toHaveTextContent('test content');
      expect(toggle.firstChild).toHaveAttribute('data-euiicon-type', 'arrowDown');
    });

    it('should not render toggle or content when content is null', () => {
      const { queryByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <EntityPanel {...defaultProps} expandable={true} />
        </ThemeProvider>
      );
      expect(queryByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).not.toBeInTheDocument();
    });
  });

  describe('panel is expandable and expanded by default', () => {
    it('should render header and content', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <EntityPanel {...defaultProps} expandable={true} expanded={true}>
            {children}
          </EntityPanel>
        </ThemeProvider>
      );
      expect(getByTestId(ENTITY_PANEL_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_HEADER_TEST_ID)).toHaveTextContent('test');
      expect(getByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).toHaveTextContent('test content');
      expect(getByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID)).toBeInTheDocument();
    });

    it('click toggle button should collapse the panel', () => {
      const { getByTestId, queryByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <EntityPanel {...defaultProps} expandable={true} expanded={true}>
            {children}
          </EntityPanel>
        </ThemeProvider>
      );

      const toggle = getByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID);
      expect(toggle.firstChild).toHaveAttribute('data-euiicon-type', 'arrowDown');
      expect(getByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).toBeInTheDocument();

      toggle.click();
      expect(toggle.firstChild).toHaveAttribute('data-euiicon-type', 'arrowRight');
      expect(queryByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).not.toBeInTheDocument();
    });

    it('should not render content when content is null', () => {
      const { queryByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <EntityPanel {...defaultProps} expandable={true} />
        </ThemeProvider>
      );
      expect(queryByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).not.toBeInTheDocument();
    });
  });
});
