import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { MiniCallout, MiniCalloutProps } from './mini_callout';

describe('MiniCallout', () => {
  const defaultProps: MiniCalloutProps = {
    color: 'primary',
    iconType: 'iInCircle',
    title: 'Mini Callout Title',
  };

  it('renders the MiniCallout component with the provided title', () => {
    render(<MiniCallout {...defaultProps} />);

    expect(screen.getByText(defaultProps.title as string)).toBeInTheDocument();
  });

  it('renders the MiniCallout component with the provided iconType and color', () => {
    const { container } = render(<MiniCallout {...defaultProps} />);

    const miniCallout = screen.getByTestId('mini-callout');
    const icon = container.querySelector('[data-euiicon-type="iInCircle"]');
    expect(icon).not.toBeNull();
    expect(miniCallout).toHaveAttribute(
      'class',
      expect.stringContaining(defaultProps.color as string)
    );
  });

  it('renders the MiniCallout component with no icon if not provided', () => {
    const { container } = render(<MiniCallout {...{ ...defaultProps, iconType: undefined }} />);

    const icon = container.querySelector('[data-euiicon-type]');
    expect(icon).toBeNull();
  });

  it('renders the dismiss link when dismissible is true', () => {
    render(<MiniCallout {...defaultProps} dismissible />);

    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('does not render the dismiss link when dismissible is false', () => {
    render(<MiniCallout {...defaultProps} dismissible={false} />);

    expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
  });

  it('removes the MiniCallout component from the DOM when the dismiss link is clicked', () => {
    render(<MiniCallout {...defaultProps} />);

    fireEvent.click(screen.getByText('Dismiss'));

    expect(screen.queryByText(defaultProps.title as string)).not.toBeInTheDocument();
  });
});
