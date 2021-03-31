/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import { Typeahead } from './typehead';
import { render } from '../../../../lib/helper/rtl_helpers';

describe('Type head', () => {
  jest.useFakeTimers();

  it('it sets initial value', () => {
    const { getByTestId, getByDisplayValue, history } = render(
      <Typeahead
        ariaLabel={'Search for data'}
        dataTestSubj={'kueryBar'}
        disabled={false}
        isLoading={false}
        initialValue={'elastic'}
        onChange={jest.fn()}
        onSubmit={() => {}}
        suggestions={[]}
        loadMore={() => {}}
        queryExample=""
      />
    );

    const input = getByTestId('uptimeKueryBarInput');

    expect(input).toBeInTheDocument();
    expect(getByDisplayValue('elastic')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'kibana' } });

    // to check if it updateds the query params, needed for debounce wait
    jest.advanceTimersByTime(250);

    expect(history.location.search).toBe('?query=kibana');
  });
});
