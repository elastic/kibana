/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import { Typeahead } from './typehead';
import { render } from '../../../../lib/helper/rtl_helpers';
import { act } from 'react-dom/test-utils';

describe('Type head', () => {
  it('it renders all tabs', () => {
    const { getByTestId } = render(
      <Typeahead
        ariaLabel={'Search for data'}
        dataTestSubj={'kueryBar'}
        disabled={false}
        isLoading={false}
        initialValue={''}
        onChange={() => {}}
        onSubmit={() => {}}
        suggestions={[]}
        loadMore={() => {}}
        queryExample=""
      />
    );

    // open popover to change
    fireEvent.click(getByTestId('syntaxChangeKql'));

    act(() => {
      // change syntax
      fireEvent.click(getByTestId('toggleKqlSyntax'));
    });

    act(() => {
      //  close popover
      fireEvent.click(getByTestId('kueryBar'));
    });

    expect(getByTestId('syntaxChangeSimple')).toBeInTheDocument();
    expect(getByTestId('toggleKqlSyntax')).toBeInTheDocument();
  });
});
