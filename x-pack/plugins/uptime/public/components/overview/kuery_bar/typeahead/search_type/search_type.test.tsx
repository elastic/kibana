/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import { render } from '../../../../../lib/helper/rtl_helpers';
import { SearchType } from './search_type';

describe('Kuery bar search type', () => {
  it('can change from simple to kq;', () => {
    let kqlSyntax = false;
    const setKqlSyntax = jest.fn((val: boolean) => {
      kqlSyntax = val;
    });

    const { getByTestId } = render(
      <SearchType kqlSyntax={kqlSyntax} setKqlSyntax={setKqlSyntax} />
    );

    // open popover to change
    fireEvent.click(getByTestId('syntaxChangeToKql'));

    // change syntax
    fireEvent.click(getByTestId('toggleKqlSyntax'));

    expect(setKqlSyntax).toHaveBeenCalledWith(true);
    expect(setKqlSyntax).toHaveBeenCalledTimes(1);
  });

  it('can change from kql to simple;', () => {
    let kqlSyntax = false;
    const setKqlSyntax = jest.fn((val: boolean) => {
      kqlSyntax = val;
    });

    const { getByTestId } = render(
      <SearchType kqlSyntax={kqlSyntax} setKqlSyntax={setKqlSyntax} />
    );

    fireEvent.click(getByTestId('syntaxChangeToKql'));

    fireEvent.click(getByTestId('toggleKqlSyntax'));

    expect(setKqlSyntax).toHaveBeenCalledWith(true);
    expect(setKqlSyntax).toHaveBeenCalledTimes(1);
  });

  it('clears the query on change to kql', () => {
    const setKqlSyntax = jest.fn();

    const { history } = render(<SearchType kqlSyntax={true} setKqlSyntax={setKqlSyntax} />, {
      url: '/app/uptime?query=test',
    });

    expect(history?.location.search).toBe('');
  });

  it('clears the search param on change to simple syntax', () => {
    const setKqlSyntax = jest.fn();

    const { history } = render(<SearchType kqlSyntax={false} setKqlSyntax={setKqlSyntax} />, {
      url: '/app/uptime?search=test',
    });

    expect(history?.location.search).toBe('');
  });
});
