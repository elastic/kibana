/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import CloudDefendEditPolicyExtension from './policy_extension_edit';
import { TestProvider } from '../../test/test_provider';
import { getCloudDefendNewPolicyMock, getCloudDefendPolicyMock } from './mocks';
import Chance from 'chance';

const chance = new Chance();

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

describe('<CloudDefendEditPolicyExtension />', () => {
  const onChange = jest.fn();

  const WrappedComponent = ({
    policy = getCloudDefendPolicyMock(),
    newPolicy = getCloudDefendNewPolicyMock(),
  }) => (
    <TestProvider>
      <CloudDefendEditPolicyExtension policy={policy} newPolicy={newPolicy} onChange={onChange} />
    </TestProvider>
  );

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders disabled <DeploymentTypeSelect/>', () => {
    const { getByLabelText } = render(<WrappedComponent />);
    const input = getByLabelText('Kubernetes Deployment') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toBeDisabled();
  });
});
