/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { ExpandedRowDetailsPane, Section, SectionConfig } from './expanded_row_details_pane';

const section: SectionConfig = {
  title: 'the-section-title',
  position: 'left',
  items: [
    {
      title: 'the-item-title',
      description: 'the-item-description',
    },
  ],
};

describe('Transform: Job List Expanded Row <ExpandedRowDetailsPane />', () => {
  test('Minimal initialization', () => {
    const { container } = render(<ExpandedRowDetailsPane sections={[section]} />);

    expect(container.textContent).toContain('the-section-title');
    expect(container.textContent).toContain('the-item-title');
    expect(container.textContent).toContain('the-item-description');
  });
});

describe('Transform: Job List Expanded Row <Section />', () => {
  test('Minimal initialization', () => {
    const { container } = render(<Section section={section} />);

    expect(container.textContent).toContain('the-section-title');
    expect(container.textContent).toContain('the-item-title');
    expect(container.textContent).toContain('the-item-description');
  });
});
