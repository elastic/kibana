/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import CspEditPolicyExtension from './policy_extension_edit';
import { TestProvider } from '../../test/test_provider';
import { getMockPolicyAWS, getMockPolicyK8s } from './mocks';
import { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';

// ensures that fields appropriately match to their label
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  ...jest.requireActual('@elastic/eui/lib/services/accessibility/html_id_generator'),
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

// ensures that fields appropriately match to their label
jest.mock('@elastic/eui/lib/services/accessibility', () => ({
  ...jest.requireActual('@elastic/eui/lib/services/accessibility'),
  useGeneratedHtmlId: () => `id-${Math.random()}`,
}));

describe('<CspEditPolicyExtension />', () => {
  const WrappedComponent = ({ newPolicy }: { newPolicy: NewPackagePolicy }) => {
    const policy = createPackagePolicyMock();
    return (
      <TestProvider>
        <CspEditPolicyExtension policy={policy} newPolicy={newPolicy} onChange={jest.fn()} />
      </TestProvider>
    );
  };

  it('renders disabled KSPM input selector', () => {
    const { getByText } = render(<WrappedComponent newPolicy={getMockPolicyK8s()} />);

    const option1 = getByText('Self-Managed/Vanilla Kubernetes', { selector: 'button span' });
    const option2 = getByText('EKS (Elastic Kubernetes Service)', { selector: 'button span' });

    expect(option1).toBeInTheDocument();
    expect(option2).toBeInTheDocument();
    expect(option1.parentElement).toBeDisabled();
    expect(option2.parentElement).toBeDisabled();
    expect(option1.querySelector('input')).toBeChecked();
  });

  it('renders disabled CSPM input selector', () => {
    const { getByText } = render(<WrappedComponent newPolicy={getMockPolicyAWS()} />);

    const option1 = getByText('Amazon Web Services', { selector: 'button span' });
    const option2 = getByText('GCP', { selector: 'button span' });
    const option3 = getByText('Azure', { selector: 'button span' });

    expect(option1).toBeInTheDocument();
    expect(option2).toBeInTheDocument();
    expect(option3).toBeInTheDocument();
    expect(option1.parentElement).toBeDisabled();
    expect(option2.parentElement).toBeDisabled();
    expect(option3.parentElement).toBeDisabled();
    expect(option1.querySelector('input')).toBeChecked();
  });
});
