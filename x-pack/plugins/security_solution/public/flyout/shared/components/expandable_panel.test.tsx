/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  EXPANDABLE_PANEL_HEADER_LEFT_SECTION_TEST_ID,
  EXPANDABLE_PANEL_HEADER_RIGHT_SECTION_TEST_ID,
  EXPANDABLE_PANEL_CONTENT_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from './test_ids';
import { ThemeProvider } from 'styled-components';
import { getMockTheme } from '../../../common/lib/kibana/kibana_react.mock';
import { ExpandablePanel } from './expandable_panel';

const mockTheme = getMockTheme({ eui: { euiColorMediumShade: '#ece' } });
const TEST_ID = 'test-id';
const defaultProps = {
  header: {
    title: 'test title',
    iconType: 'storage',
  },
  'data-test-subj': TEST_ID,
};
const children = <p>{'test content'}</p>;

describe('<ExpandablePanel />', () => {
  describe('panel is not expandable by default', () => {
    it('should render non-expandable panel by default', () => {
      const { getByTestId, queryByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <ExpandablePanel {...defaultProps}>{children}</ExpandablePanel>
        </ThemeProvider>
      );
      expect(getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(TEST_ID))).toBeInTheDocument();
      expect(getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(TEST_ID))).toHaveTextContent(
        'test content'
      );
      expect(queryByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(TEST_ID))).not.toBeInTheDocument();
    });

    it('should only render left section of panel header when headerContent is not passed', () => {
      const { getByTestId, queryByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <ExpandablePanel {...defaultProps}>{children}</ExpandablePanel>
        </ThemeProvider>
      );
      expect(getByTestId(EXPANDABLE_PANEL_HEADER_LEFT_SECTION_TEST_ID(TEST_ID))).toHaveTextContent(
        'test title'
      );
      expect(
        queryByTestId(EXPANDABLE_PANEL_HEADER_RIGHT_SECTION_TEST_ID(TEST_ID))
      ).not.toBeInTheDocument();
    });

    it('should render header properly when headerContent is available', () => {
      const props = {
        ...defaultProps,
        header: { ...defaultProps.header, headerContent: <>{'test header content'}</> },
      };
      const { getByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <ExpandablePanel {...props}>{children}</ExpandablePanel>
        </ThemeProvider>
      );
      expect(
        getByTestId(EXPANDABLE_PANEL_HEADER_LEFT_SECTION_TEST_ID(TEST_ID))
      ).toBeInTheDocument();
      expect(
        getByTestId(EXPANDABLE_PANEL_HEADER_RIGHT_SECTION_TEST_ID(TEST_ID))
      ).toBeInTheDocument();
      expect(getByTestId(EXPANDABLE_PANEL_HEADER_RIGHT_SECTION_TEST_ID(TEST_ID))).toHaveTextContent(
        'test header content'
      );
    });

    it('should not render content when content is null', () => {
      const { queryByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <ExpandablePanel {...defaultProps} />
        </ThemeProvider>
      );

      expect(queryByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(TEST_ID))).not.toBeInTheDocument();
      expect(queryByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(TEST_ID))).not.toBeInTheDocument();
    });
  });

  describe('panel is expandable', () => {
    const expandableDefaultProps = {
      ...defaultProps,
      expand: { expandable: true },
    };

    it('should render panel with toggle and collapsed by default', () => {
      const { getByTestId, queryByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <ExpandablePanel {...expandableDefaultProps}>{children}</ExpandablePanel>
        </ThemeProvider>
      );
      expect(getByTestId(EXPANDABLE_PANEL_HEADER_LEFT_SECTION_TEST_ID(TEST_ID))).toHaveTextContent(
        'test title'
      );
      expect(queryByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(TEST_ID))).not.toBeInTheDocument();
    });

    it('click toggle button should expand the panel', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <ExpandablePanel {...expandableDefaultProps}>{children}</ExpandablePanel>
        </ThemeProvider>
      );

      const toggle = getByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(TEST_ID));
      expect(toggle.firstChild).toHaveAttribute('data-euiicon-type', 'arrowRight');
      toggle.click();

      expect(getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(TEST_ID))).toHaveTextContent(
        'test content'
      );
      expect(toggle.firstChild).toHaveAttribute('data-euiicon-type', 'arrowDown');
    });

    it('should not render toggle or content when content is null', () => {
      const { queryByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <ExpandablePanel {...expandableDefaultProps} />
        </ThemeProvider>
      );
      expect(queryByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(TEST_ID))).not.toBeInTheDocument();
      expect(queryByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(TEST_ID))).not.toBeInTheDocument();
    });
  });

  describe('panel is expandable and expanded', () => {
    const expandedDefaultProps = {
      ...defaultProps,
      expand: { expandable: true, expandedOnFirstRender: true },
    };

    it('should render header and content', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <ExpandablePanel {...expandedDefaultProps}>{children}</ExpandablePanel>
        </ThemeProvider>
      );
      expect(getByTestId(EXPANDABLE_PANEL_HEADER_LEFT_SECTION_TEST_ID(TEST_ID))).toHaveTextContent(
        'test title'
      );
      expect(getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(TEST_ID))).toHaveTextContent(
        'test content'
      );
      expect(getByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(TEST_ID))).toBeInTheDocument();
    });

    it('click toggle button should collapse the panel', () => {
      const { getByTestId, queryByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <ExpandablePanel {...expandedDefaultProps}>{children}</ExpandablePanel>
        </ThemeProvider>
      );

      const toggle = getByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(TEST_ID));
      expect(toggle.firstChild).toHaveAttribute('data-euiicon-type', 'arrowDown');
      expect(getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(TEST_ID))).toBeInTheDocument();

      toggle.click();
      expect(toggle.firstChild).toHaveAttribute('data-euiicon-type', 'arrowRight');
      expect(queryByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(TEST_ID))).not.toBeInTheDocument();
    });

    it('should not render content when content is null', () => {
      const { queryByTestId } = render(
        <ThemeProvider theme={mockTheme}>
          <ExpandablePanel {...expandedDefaultProps} />
        </ThemeProvider>
      );
      expect(queryByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(TEST_ID))).not.toBeInTheDocument();
      expect(queryByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(TEST_ID))).not.toBeInTheDocument();
    });
  });
});
