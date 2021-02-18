/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiBasicTable, EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';

import { reactRouterNavigate } from '../../../../../../../../../../src/plugins/kibana_react/public';

import { useForm } from '../../../../../../shared_imports';

import { useAppContext } from '../../../../../app_context';
import { getPolicyRollupWizardPath } from '../../../../../services/navigation';

import { DescribedFormRow } from '../../described_form_row';

export const RollupField: FunctionComponent = () => {
  const history = useHistory();
  const form = useForm();
  const { setCurrentPolicy } = useAppContext();
  return (
    <DescribedFormRow title={<h3>Rollup</h3>} fullWidth>
      <EuiBasicTable
        columns={[
          { field: 'name', name: 'Name' },
          {
            name: 'Actions',
            actions: [
              {
                name: 'Edit',
                description: 'Edit this rollup',
                render: () => (
                  <EuiButtonIcon
                    aria-label="edit this rollup"
                    iconType="pencil"
                    onClick={() => {}}
                  />
                ),
              },
              {
                name: 'Delete',
                description: 'Delete this rollup',
                render: () => (
                  <EuiButtonIcon
                    aria-label="delete this rollup"
                    iconType="trash"
                    color="danger"
                    onClick={() => {}}
                  />
                ),
              },
            ],
          },
        ]}
        items={[{ name: 'Rollup alpha' }, { name: 'Rollup beta' }]}
      />
      <EuiButtonEmpty
        iconType="plusInACircle"
        {...reactRouterNavigate(history, getPolicyRollupWizardPath())}
      >
        Add rollup
      </EuiButtonEmpty>
    </DescribedFormRow>
  );
};
