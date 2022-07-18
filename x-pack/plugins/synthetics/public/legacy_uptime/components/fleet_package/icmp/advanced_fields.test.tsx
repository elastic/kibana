/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../lib/helper/rtl_helpers';
import { ICMPAdvancedFields } from './advanced_fields';

// ensures fields and labels map appropriately
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

describe('<ICMPAdvancedFields />', () => {
  const WrappedComponent = ({ children }: { children?: React.ReactNode }) => (
    <ICMPAdvancedFields>{children}</ICMPAdvancedFields>
  );

  it('renders upstream fields', () => {
    const upstreamFieldsText = 'Monitor Advanced field section';
    const { getByText, getByTestId } = render(
      <WrappedComponent>{upstreamFieldsText}</WrappedComponent>
    );

    const upstream = getByText(upstreamFieldsText) as HTMLInputElement;
    const accordion = getByTestId('syntheticsICMPAdvancedFieldsAccordion') as HTMLInputElement;
    expect(upstream).toBeInTheDocument();
    expect(accordion).toBeInTheDocument();
  });
});
