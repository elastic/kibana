/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { HttpStatusBadge } from '.';
import { renderWithTheme } from '../../../../utils/test_helpers';
import { httpStatusCodeToColor } from '../../../../utils/http_status_code_to_color';

describe('HttpStatusBadge', () => {
  it('renders status code 100 with neutral color', () => {
    renderWithTheme(<HttpStatusBadge status={100} />);
    const badge = screen.getByTestId('httpStatusBadge');
    expect(badge).toHaveStyle({
      '--euiBadgeBackgroundColor': httpStatusCodeToColor(100),
    });
    expect(badge).toHaveTextContent('100');
  });

  it('renders status code 200 with success color', () => {
    renderWithTheme(<HttpStatusBadge status={200} />);
    const badge = screen.getByTestId('httpStatusBadge');
    expect(badge).toHaveStyle({
      '--euiBadgeBackgroundColor': httpStatusCodeToColor(200),
    });
    expect(badge).toHaveTextContent('200');
  });

  it('renders status code 301 with neutral color', () => {
    renderWithTheme(<HttpStatusBadge status={301} />);
    const badge = screen.getByTestId('httpStatusBadge');
    expect(badge).toHaveStyle({
      '--euiBadgeBackgroundColor': httpStatusCodeToColor(301),
    });
    expect(badge).toHaveTextContent('301');
  });

  it('renders status code 404 with warning color', () => {
    renderWithTheme(<HttpStatusBadge status={404} />);
    const badge = screen.getByTestId('httpStatusBadge');
    expect(badge).toHaveStyle({
      '--euiBadgeBackgroundColor': httpStatusCodeToColor(404),
    });
    expect(badge).toHaveTextContent('404');
  });

  it('renders status code 502 with error color', () => {
    renderWithTheme(<HttpStatusBadge status={502} />);
    const badge = screen.getByTestId('httpStatusBadge');
    expect(badge).toHaveStyle({
      '--euiBadgeBackgroundColor': httpStatusCodeToColor(502),
    });
    expect(badge).toHaveTextContent('502');
  });

  it('renders other status codes with default color', () => {
    renderWithTheme(<HttpStatusBadge status={700} />);

    const badge = screen.getByTestId('httpStatusBadge');
    expect(badge).not.toHaveStyle({
      '--euiBadgeBackgroundColor': expect.any(String),
    });
    expect(badge.className).toContain('default');
    expect(badge).toHaveTextContent('700');
  });
});
