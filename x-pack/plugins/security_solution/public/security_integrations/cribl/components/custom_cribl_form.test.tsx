/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NewPackagePolicy, PackageInfo, PackagePolicy } from '@kbn/fleet-plugin/common';
import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { getFleetManagedIndexTemplates } from '../api/api';
import { CustomCriblForm } from './custom_cribl_form';

jest.mock('../api/api');
const onChange = jest.fn();

describe('<CustomCriblForm />', () => {
  const mockPackagePolicy = {
    name: 'cribl-1',
    description: '',
    namespace: 'default',
    enabled: true,
    policy_id: '',
    policy_ids: [''],
    package: {
      name: 'cribl',
      title: 'Cribl',
      version: '0.2.0',
    },
    inputs: [],
  };

  const WrappedComponent = ({ newPolicy }: { newPolicy: NewPackagePolicy }) => (
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

  const datastreamOpts = ['logs-destination1.cloud', 'logs-destination2'];

  it('renders dataId and datastream; updates dataId', async () => {
    (getFleetManagedIndexTemplates as jest.Mock).mockReturnValue({
      indexTemplates: datastreamOpts,
      permissionsError: false,
      generalError: false,
    });

    const { getByLabelText, getByTestId } = render(
      <WrappedComponent newPolicy={mockPackagePolicy} />
    );
    const dataId = getByLabelText('Cribl _dataId field');
    const datastream = getByLabelText('Datastream');

    await waitFor(() => {
      expect(dataId).toBeInTheDocument();
      expect(datastream).toBeInTheDocument();
    });

    userEvent.type(dataId, 'myDataId');

    const datastreamComboBox = getByTestId('comboBoxSearchInput');
    userEvent.type(datastreamComboBox, datastreamOpts[0]);

    const datastreamComboBoxOpts = getByTestId('comboBoxOptionsList');
    await waitFor(() => {
      expect(datastreamComboBoxOpts).toBeInTheDocument();
    });

    const ourOption = within(datastreamComboBoxOpts).getByRole('option');
    ourOption.click();

    expect(onChange).toHaveBeenLastCalledWith({
      isValid: true,
      updatedPolicy: {
        ...mockPackagePolicy,
        vars: {
          route_entries: {
            value: '[{"dataId":"myDataId","datastream":"logs-destination1.cloud"}]',
          },
        },
      },
    });
  });
});
