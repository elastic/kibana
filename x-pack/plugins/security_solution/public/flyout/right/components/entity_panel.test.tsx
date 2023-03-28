/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EntityPanel } from './entity_panel';
import type { EntityType } from '../types';
import {
  ENTITY_PANEL_TEST_ID,
  ENTITY_PANEL_ICON_TEST_ID,
  ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID,
  ENTITY_PANEL_HEADER_TEST_ID,
  ENTITY_PANEL_CONTENT_TEST_ID,
} from './test_ids';

const defaultProps = {
  title: 'test',
  type: 'host' as EntityType,
  content: 'test content',
};

describe('<EntityPanel />', () => {
  describe('panel is not expandable', () => {
    it('should render non-expandable panel by default for host type', () => {
      const { getByTestId } = render(<EntityPanel {...defaultProps} />);

      expect(getByTestId(ENTITY_PANEL_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_HEADER_TEST_ID)).toHaveTextContent('test');
      expect(getByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).toHaveTextContent('test content');

      expect(getByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID)).not.toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_ICON_TEST_ID)).toHaveAttribute('entity-icon-host');
    });

    it('should render non-expandable panel by default for user type', () => {
      const { getByTestId } = render(<EntityPanel {...defaultProps} type={'user' as EntityType} />);

      expect(getByTestId(ENTITY_PANEL_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_HEADER_TEST_ID)).toHaveTextContent('test');
      expect(getByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).toHaveTextContent('test content');

      expect(getByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID)).not.toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_ICON_TEST_ID)).toHaveAttribute('entity-icon-user');
    });

    it('should not render content when content is null', () => {
      const { getByTestId } = render(<EntityPanel {...defaultProps} content={null} />);

      expect(getByTestId(ENTITY_PANEL_HEADER_TEST_ID)).toHaveTextContent('test');
      expect(getByTestId(ENTITY_PANEL_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).not.toBeInTheDocument();

      expect(getByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    });
  });

  describe('panel is expandable', () => {
    it('should render expandable panel for host type', () => {
      const { getByTestId } = render(<EntityPanel {...defaultProps} expandable={true} />);

      expect(getByTestId(ENTITY_PANEL_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_HEADER_TEST_ID)).toHaveTextContent('test');
      expect(getByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).toHaveTextContent('test content');

      expect(getByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID)).toHaveAttribute('arrowRight');
      expect(getByTestId(ENTITY_PANEL_ICON_TEST_ID)).toHaveAttribute('entity-icon-host');
    });

    it('should render expandable panel for user type', () => {
      const { getByTestId } = render(
        <EntityPanel {...defaultProps} type={'user' as EntityType} expandable={true} />
      );

      expect(getByTestId(ENTITY_PANEL_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_HEADER_TEST_ID)).toHaveTextContent('test');
      expect(getByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID)).toHaveAttribute('arrowRight');

      expect(getByTestId(ENTITY_PANEL_ICON_TEST_ID)).toHaveAttribute('entity-icon-user');
      expect(getByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).toHaveTextContent('test content');
    });

    it('should not render content when content is null', () => {
      const { getByTestId } = render(
        <EntityPanel {...defaultProps} content={null} expandable={true} />
      );

      expect(getByTestId(ENTITY_PANEL_HEADER_TEST_ID)).toHaveTextContent('test');
      expect(getByTestId(ENTITY_PANEL_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_TOGGLE_BUTTON_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITY_PANEL_CONTENT_TEST_ID)).not.toBeInTheDocument();
    });
  });
});
