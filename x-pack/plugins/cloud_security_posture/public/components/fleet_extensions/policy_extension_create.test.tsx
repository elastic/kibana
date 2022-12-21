/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import CspCreatePolicyExtension from './policy_extension_create';
import { eksVars } from './eks_form';
import Chance from 'chance';
import { TestProvider } from '../../test/test_provider';
import userEvent from '@testing-library/user-event';
import { getCspNewPolicyMock } from './mocks';

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

const chance = new Chance();

describe('<CspCreatePolicyExtension />', () => {
  const onChange = jest.fn();

  const WrappedComponent = ({ newPolicy = getCspNewPolicyMock() }) => (
    <TestProvider>
      <CspCreatePolicyExtension newPolicy={newPolicy} onChange={onChange} />
    </TestProvider>
  );

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders non-disabled <DeploymentTypeSelect/>', () => {
    const { getByLabelText } = render(<WrappedComponent />);
    const input = getByLabelText('Kubernetes Deployment') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).not.toBeDisabled();
  });

  it('renders non-disabled <EksForm/>', () => {
    const { getByLabelText } = render(
      <WrappedComponent newPolicy={getCspNewPolicyMock('cis_eks')} />
    );

    eksVars.forEach((eksVar) => {
      expect(getByLabelText(eksVar.label)).toBeInTheDocument();
      expect(getByLabelText(eksVar.label)).not.toBeDisabled();
    });
  });

  it('handles updating deployment type', () => {
    const { getByLabelText } = render(<WrappedComponent />);
    const input = getByLabelText('Kubernetes Deployment') as HTMLInputElement;

    userEvent.type(input, 'EKS (Elastic Kubernetes Service){enter}');

    expect(onChange).toBeCalledWith({
      isValid: true,
      updatedPolicy: getCspNewPolicyMock('cis_eks'),
    });
  });

  it('handles updating EKS vars', () => {
    const { getByLabelText } = render(
      <WrappedComponent newPolicy={getCspNewPolicyMock('cis_eks')} />
    );

    const randomValues = chance.unique(chance.string, eksVars.length);

    eksVars.forEach((eksVar, i) => {
      const eksVarInput = getByLabelText(eksVar.label) as HTMLInputElement;
      fireEvent.change(eksVarInput, { target: { value: randomValues[i] } });

      const policy = getCspNewPolicyMock('cis_eks');
      policy.inputs[1].streams[0].vars![eksVar.id].value = randomValues[i];

      expect(onChange).toBeCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });
  });
});
