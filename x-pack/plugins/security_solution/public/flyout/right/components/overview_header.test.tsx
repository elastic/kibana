/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { OverviewHeader } from './overview_header';
import { RightPanelContext } from '../context';

const defaultProps = {
  title: 'test title',
};

const testChildren = <p>{'test content'}</p>;

describe('<OverviewHeader />', () => {
  describe('default header', () => {
    const contextValue = {
      eventId: 'eventId',
    } as unknown as RightPanelContext;
    it('should render header as collapsed', () => {
      const wrapper = render(
        <RightPanelContext.Provider value={contextValue}>
          <OverviewHeader {...defaultProps}>{testChildren}</OverviewHeader>
        </RightPanelContext.Provider>
      );
      expect(wrapper.getByText(defaultProps.title)).toBeInTheDocument();
      expect(wrapper.getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'false');
      expect(wrapper.queryByText('test content')).not.toBeVisible();
    });

    it('should expand when clicking icon', () => {
      const wrapper = render(
        <RightPanelContext.Provider value={contextValue}>
          <OverviewHeader {...defaultProps}>{testChildren}</OverviewHeader>
        </RightPanelContext.Provider>
      );
      wrapper.getAllByRole('button')[0].click();
      expect(wrapper.getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'true');
      expect(wrapper.queryByText('test content')).toBeVisible();
    });
  });

  describe('default expanded', () => {
    const contextValue = {
      eventId: 'eventId',
    } as unknown as RightPanelContext;
    it('should render header and children when expanded is true', () => {
      const wrapper = render(
        <RightPanelContext.Provider value={contextValue}>
          <OverviewHeader {...defaultProps} expanded={true}>
            {testChildren}
          </OverviewHeader>
        </RightPanelContext.Provider>
      );
      expect(wrapper.getByText(defaultProps.title)).toBeInTheDocument();
      expect(wrapper.getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'true');
      expect(wrapper.queryByText('test content')).toBeVisible();
    });

    it('should collapse when clicking icon', () => {
      const wrapper = render(
        <RightPanelContext.Provider value={contextValue}>
          <OverviewHeader {...defaultProps} expanded={true}>
            {testChildren}
          </OverviewHeader>
        </RightPanelContext.Provider>
      );
      wrapper.getAllByRole('button')[0].click();
      expect(wrapper.getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'false');
      expect(wrapper.queryByText('test content')).not.toBeVisible();
    });
  });
  describe('disabled header', () => {
    it('should render header disable header when disable is true', () => {
      const wrapper = render(
        <OverviewHeader {...defaultProps} disabled={true}>
          {testChildren}
        </OverviewHeader>
      );
      expect(wrapper.getByText(defaultProps.title)).toBeInTheDocument();
      expect(wrapper.getAllByRole('button')[0]).toHaveAttribute('disabled');
      expect(wrapper.queryByText('test content')).not.toBeVisible();
    });

    it('should disable header when no children is passed', () => {
      const wrapper = render(<OverviewHeader {...defaultProps} />);
      expect(wrapper.getByText(defaultProps.title)).toBeInTheDocument();

      expect(wrapper.getAllByRole('button')[0]).toHaveAttribute('disabled');
    });

    it('should disable header when children is null', () => {
      const wrapper = render(<OverviewHeader {...defaultProps}>{null}</OverviewHeader>);
      expect(wrapper.getByText(defaultProps.title)).toBeInTheDocument();

      expect(wrapper.getAllByRole('button')[0]).toHaveAttribute('disabled');
    });
  });
});
