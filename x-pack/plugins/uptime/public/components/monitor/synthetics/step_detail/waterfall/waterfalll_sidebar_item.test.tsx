/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import 'jest-canvas-mock';
import { fireEvent } from '@testing-library/react';

import { SidebarItem } from '../waterfall/types';
import { render } from '../../../../../lib/helper/rtl_helpers';
import { WaterfallSidebarItem } from './waterfall_sidebar_item';
import { SIDEBAR_FILTER_MATCHES_SCREENREADER_LABEL } from '../../waterfall/components/translations';

describe('waterfall filter', () => {
  const url = 'http://www.elastic.co';
  const index = 0;
  const offsetIndex = index + 1;
  const item: SidebarItem = {
    url,
    isHighlighted: true,
    index,
    offsetIndex,
  };

  it('renders sidbar item', () => {
    const { getByText } = render(<WaterfallSidebarItem item={item} />);

    expect(getByText(`${offsetIndex}. ${url}`));
  });

  it('render screen reader text when renderFilterScreenReaderText is true', () => {
    const { getByLabelText } = render(
      <WaterfallSidebarItem item={item} renderFilterScreenReaderText={true} />
    );

    expect(
      getByLabelText(`${SIDEBAR_FILTER_MATCHES_SCREENREADER_LABEL} ${offsetIndex}. ${url}`)
    ).toBeInTheDocument();
  });

  it('does not render screen reader text when renderFilterScreenReaderText is false', () => {
    const onClick = jest.fn();
    const { getByRole } = render(
      <WaterfallSidebarItem item={item} renderFilterScreenReaderText={false} onClick={onClick} />
    );
    const button = getByRole('button');
    fireEvent.click(button);

    expect(button).toBeInTheDocument();
    expect(onClick).toBeCalled();
  });
});
