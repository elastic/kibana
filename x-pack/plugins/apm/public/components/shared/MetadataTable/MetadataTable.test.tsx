/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MetadataTable } from '.';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { expectTextsInDocument } from '../../../utils/testHelpers';
import { SectionsWithRows } from './helper';

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
    const sectionsWithRows = ([
      { key: 'foo', label: 'Foo', required: true },
      {
        key: 'bar',
        label: 'Bar',
        required: false,
        properties: ['props.A', 'props.B'],
        rows: [
          { key: 'props.A', value: 'A' },
          { key: 'props.B', value: 'B' },
        ],
      },
    ] as unknown) as SectionsWithRows;
    const output = render(
      <MetadataTable sections={sectionsWithRows} />,
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
      const sectionsWithRows = ([
        {
          key: 'foo',
          label: 'Foo',
          required: true,
        },
      ] as unknown) as SectionsWithRows;
      const output = render(
        <MetadataTable sections={sectionsWithRows} />,
        renderOptions
      );
      expectTextsInDocument(output, ['Foo', 'No data available']);
    });
  });
});
