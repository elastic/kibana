/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { FiltersSection } from './filters_section';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { MockApmPluginContextWrapper } from '../../../../../context/apm_plugin/mock_apm_plugin_context';
import { i18n } from '@kbn/i18n';

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <EuiThemeProvider>
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </EuiThemeProvider>
  );
}

describe('FiltersSections', () => {
  it('renders the component', () => {
    const { getByText } = render(<FiltersSection filters={[]} onChangeFilters={() => {}} />, {
      wrapper: Wrapper,
    });

    expect(
      getByText(
        i18n.translate('xpack.apm.settings.customLink.flyout.filters.title', {
          defaultMessage: 'Filters',
        })
      )
    ).toBeInTheDocument();
  });
  it('empties the key and the value, when I have only 1 filter and I delete the filter', () => {});
  it('empties the value, when the key changes', () => {});
});
