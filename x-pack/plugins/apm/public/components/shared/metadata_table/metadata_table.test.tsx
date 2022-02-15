/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MetadataTable } from '.';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { expectTextsInDocument } from '../../../utils/test_helpers';
import type { SectionDescriptor } from './types';

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter>
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

const renderOptions = {
  wrapper: Wrapper,
};

describe('MetadataTable', () => {
  it('shows sections', () => {
    const sections: SectionDescriptor[] = [
      { key: 'foo', label: 'Foo', required: true, properties: [] },
      {
        key: 'bar',
        label: 'Bar',
        required: false,
        properties: [
          { field: 'props.A', value: ['A'] },
          { field: 'props.B', value: ['B'] },
        ],
      },
    ];
    const output = render(
      <MetadataTable sections={sections} isLoading={false} />,
      renderOptions
    );
    expectTextsInDocument(output, [
      'Foo',
      'No data available',
      'Bar',
      'props.A',
      'A',
      'props.B',
      'B',
    ]);
  });
  describe('required sections', () => {
    it('shows "empty state message" if no data is available', () => {
      const sectionsWithRows: SectionDescriptor[] = [
        {
          key: 'foo',
          label: 'Foo',
          required: true,
          properties: [],
        },
      ];

      const output = render(
        <MetadataTable sections={sectionsWithRows} isLoading={false} />,
        renderOptions
      );
      expectTextsInDocument(output, ['Foo', 'No data available']);
    });
  });
});
