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
  ENTITY_PANEL_TEST_ID,
  ENTITY_PANEL_ICON_TEST_ID,
  ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID,
  ENTITY_PANEL_HEADER_TEST_ID,
  ENTITY_PANEL_CONTENT_TEST_ID,
} from './test_ids';

const defaultProps = {
  title: 'test',
  iconType: 'storage',
  content: 'test content',
};

describe('<EntityPanel />', () => {
  describe('panel is not expandable by default', () => {
    it('should render non-expandable panel by default', () => {
      const { getByTestId, queryByTestId } = render(<EntityPanel {...defaultProps} />);

      expect(getByTestId(ENTITY_PANEL_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_HEADER_TEST_ID)).toHaveTextContent('test');
      expect(getByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).toHaveTextContent('test content');

      expect(queryByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID)).not.toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_ICON_TEST_ID).firstChild).toHaveAttribute(
        'data-euiicon-type',
        'storage'
      );
    });

    it('should not render content when content is null', () => {
      const { queryByTestId } = render(<EntityPanel {...defaultProps} content={null} />);

      expect(queryByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    });
  });

  describe('panel is expandable', () => {
    it('should render panel with toggle and collapsed by default', () => {
      const { getByTestId, queryByTestId } = render(
        <EntityPanel {...defaultProps} expandable={true} />
      );
      expect(getByTestId(ENTITY_PANEL_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_HEADER_TEST_ID)).toHaveTextContent('test');
      expect(queryByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).not.toBeInTheDocument();
    });

    it('click toggle button should expand the panel', () => {
      const { getByTestId } = render(<EntityPanel {...defaultProps} expandable={true} />);

      const toggle = getByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID);
      expect(toggle.firstChild).toHaveAttribute('data-euiicon-type', 'arrowRight');
      toggle.click();

      expect(getByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).toHaveTextContent('test content');
      expect(toggle.firstChild).toHaveAttribute('data-euiicon-type', 'arrowDown');
    });

    it('should not render toggle or content when content is null', () => {
      const { queryByTestId } = render(
        <EntityPanel {...defaultProps} content={null} expandable={true} />
      );
      expect(queryByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).not.toBeInTheDocument();
    });
  });

  describe('panel is expandable and expanded by default', () => {
    it('should render header and content', () => {
      const { getByTestId } = render(
        <EntityPanel {...defaultProps} expandable={true} expanded={true} />
      );
      expect(getByTestId(ENTITY_PANEL_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_HEADER_TEST_ID)).toHaveTextContent('test');
      expect(getByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).toHaveTextContent('test content');
      expect(getByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID)).toBeInTheDocument();
    });

    it('click toggle button should collapse the panel', () => {
      const { getByTestId, queryByTestId } = render(
        <EntityPanel {...defaultProps} expandable={true} expanded={true} />
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
        <EntityPanel {...defaultProps} content={null} expandable={true} />
      );
      expect(queryByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).not.toBeInTheDocument();
    });
  });
});
