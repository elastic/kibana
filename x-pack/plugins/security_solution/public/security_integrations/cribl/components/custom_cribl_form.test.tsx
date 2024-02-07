/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { NewPackagePolicy, PackageInfo, PackagePolicy } from '@kbn/fleet-plugin/common';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from "react";
import { TestProviders } from '../../../common/mock';
import { getFleetManagedIndexTemplates } from '../api/api';
import { CustomCriblForm } from "./custom_cribl_form";

jest.mock('../api/api');
const onChange = jest.fn();

describe('<CustomCriblForm />', () => {
  const FormComponent = ({ newPolicy }: {
    newPolicy: NewPackagePolicy;
    packageInfo?: PackageInfo;
    onChange?: jest.Mock<void, [NewPackagePolicy]>;
  }) => (
    <TestProviders>
      <CustomCriblForm
        policy={newPolicy as PackagePolicy}
        newPolicy={newPolicy}
        onChange={onChange}
        packageInfo={{} as PackageInfo}
        isEditPage={true}
      />
    </TestProviders>
  );

  const datastreamOpts = ["logs-destination1.cloud", "logs-destination2"];

  (getFleetManagedIndexTemplates as jest.Mock).mockReturnValue({
    indexTemplates: datastreamOpts,
    permissionsError: false,
    generalError: false,
  });

  it('renders dataId and datastream; updates dataId', async () => {
    (getFleetManagedIndexTemplates as jest.Mock).mockReturnValue({
      indexTemplates: datastreamOpts,
      permissionsError: false,
      generalError: false,
    });

    const mockPackagePolicy = {
      name: 'cribl-1',
      description: '',
      namespace: 'default',
      enabled: true,
      policy_id: '93c46720-c217-11ea-9906-b5b8a21b268e',
      package: {
        name: 'cribl',
        title: 'Cribl',
        version: '0.2.0',
      },
      inputs: [],
      vars: {
        route_entries: {
          value: '[{"dataId":"myDataId1","datastream":"logs-destination1.cloud"}]'
        },
      },
    };
    const { getByLabelText } = render(<FormComponent newPolicy={mockPackagePolicy} />);
    const dataId = getByLabelText('Cribl _dataId field');
    const datastream = getByLabelText('Datastream');
    
    await waitFor(() => {
      expect(dataId).toBeInTheDocument();
      expect(datastream).toBeInTheDocument();
    });

    userEvent.clear(dataId);
    userEvent.type(dataId, 'myDataIdUpdated');

    expect(onChange).toHaveBeenLastCalledWith({
      isValid: true,
      updatedPolicy: { ...mockPackagePolicy, vars: {
        route_entries: {
          value: '[{"dataId":"myDataIdUpdated","datastream":"logs-destination1.cloud"}]'
        },
      }},
    });
  });
});