/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  CopyToClipboardButtonEmpty,
  CopyToClipboardButtonIcon,
  CopyToClipboardContextMenu,
} from '.';

const mockValue: string = 'Text copied';

const mockTestId: string = 'abc';

describe('<CopyToClipboardButtonEmpty /> <CopyToClipboardContextMenu />', () => {
  it('should render one EuiButtonEmtpy', () => {
    const component = render(
      <CopyToClipboardButtonEmpty value={mockValue} data-test-subj={mockTestId} />
    );

    expect(component.getByTestId(mockTestId)).toBeInTheDocument();
    expect(component).toMatchSnapshot();
  });

  it('should render one EuiContextMenuItem (for EuiContextMenu use)', () => {
    const component = render(
      <CopyToClipboardContextMenu value={mockValue} data-test-subj={mockTestId} />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render one EuibuttonIcon', () => {
    const component = render(
      <CopyToClipboardButtonIcon value={mockValue} data-test-subj={mockTestId} />
    );

    expect(component).toMatchSnapshot();
  });
});
