/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, within } from '@testing-library/react';
import React, { type ComponentProps } from 'react';

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { Role } from '@kbn/security-plugin-types-common';

import { SpaceAssignedRolesTable } from './space_assigned_roles_table';

const defaultProps: Pick<
  ComponentProps<typeof SpaceAssignedRolesTable>,
  | 'onClickAssignNewRole'
  | 'onClickBulkRemove'
  | 'onClickRowEditAction'
  | 'onClickRowRemoveAction'
  | 'currentSpace'
> = {
  currentSpace: {
    id: 'odyssey',
    name: 'Odyssey',
    disabledFeatures: [],
  },
  onClickBulkRemove: jest.fn(),
  onClickRowEditAction: jest.fn(),
  onClickAssignNewRole: jest.fn(),
  onClickRowRemoveAction: jest.fn(),
};

const renderTestComponent = (
  props: Pick<
    ComponentProps<typeof SpaceAssignedRolesTable>,
    'assignedRoles' | 'isReadOnly' | 'supportsBulkAction'
  >
) => {
  render(
    <IntlProvider locale="en">
      <SpaceAssignedRolesTable {...defaultProps} {...props} />
    </IntlProvider>
  );
};

describe('SpaceAssignedRolesTable', () => {
  const spaceAssignedRoles = new Map<string, Role>(
    [
      {
        name: 'Odyssey',
        description: 'Journey vs. Destination',
        elasticsearch: { cluster: [], run_as: [], indices: [] },
        kibana: [
          {
            spaces: [defaultProps.currentSpace.id],
            base: ['all'],
            feature: {},
          },
        ],
      },
      {
        name: 'Iliad',
        description: '???',
        elasticsearch: { cluster: [], run_as: [], indices: [] },
        kibana: [
          {
            spaces: [defaultProps.currentSpace.id],
            base: ['read'],
            feature: {},
          },
        ],
      },
      {
        name: 'Trisolaris',
        description: 'Dark Forest???',
        elasticsearch: { cluster: [], run_as: [], indices: [] },
        kibana: [
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
        ],
        metadata: {
          _reserved: true,
        },
      },
    ].map((role) => [role.name.toLocaleLowerCase(), role])
  );

  it('renders the table', () => {
    renderTestComponent({
      assignedRoles: spaceAssignedRoles,
    });

    expect(screen.getByTestId('spaceAssignedRolesTable')).toBeInTheDocument();
  });

  it('does not render row selection and bulk actions context menu by default', () => {
    renderTestComponent({
      assignedRoles: spaceAssignedRoles,
      supportsBulkAction: false,
    });

    expect(screen.getByTestId('spaceAssignedRolesTable')).toBeInTheDocument();
    expect(screen.queryByTestId('bulkActionsContextMenuOpener')).toBeNull();
    expect(screen.queryByTestId('checkboxSelectAll')).toBeNull();
  });

  it('renders with row selection and bulk actions context menu when bulk action are supported and table is not in readOnly mode', () => {
    renderTestComponent({
      assignedRoles: spaceAssignedRoles,
      supportsBulkAction: true,
    });

    expect(screen.getByTestId('spaceAssignedRolesTable')).toBeInTheDocument();
    expect(screen.getByTestId('bulkActionsContextMenuOpener')).toBeInTheDocument();
    expect(screen.getByTestId('checkboxSelectAll')).toBeInTheDocument();
  });

  // it('will not render the bulk actions context menu when the table is in readOnly mode', () => {})

  it('prevents modification of reserved roles', () => {
    renderTestComponent({
      assignedRoles: spaceAssignedRoles,
      supportsBulkAction: true,
    });

    expect(screen.getByTestId('spaceAssignedRolesTable')).toBeInTheDocument();

    const trisolarisRow = screen.getByTestId('space-role-row-Trisolaris');

    expect(trisolarisRow).toBeInTheDocument();

    // We expect a length of 2 because EUI also adds a second node for screen readers
    expect(within(trisolarisRow).getAllByText('Reserved')).toHaveLength(2);
    expect(within(trisolarisRow).getByTestId('spaceRoleCellActionLocked')).toBeInTheDocument();
    expect(within(trisolarisRow).getByTestId('spaceRoleCellActionLocked')).toBeDisabled();
    expect(
      within(trisolarisRow).queryByTestId('spaceRoleCellDeleteAction')
    ).not.toBeInTheDocument();
    expect(within(trisolarisRow).queryByTestId('spaceRoleCellEditAction')).not.toBeInTheDocument();
  });
});
