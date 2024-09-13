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
  props: Pick<ComponentProps<typeof SpaceAssignedRolesTable>, 'assignedRoles' | 'isReadOnly'>
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
      isReadOnly: false,
    });

    expect(screen.getByTestId('spaceAssignedRolesTable')).toBeInTheDocument();
    expect(screen.getByTestId('bulkActionsContextMenuOpener')).toBeInTheDocument();
  });

  it('does not render bulk action content menu when in read-only mode', () => {
    renderTestComponent({
      assignedRoles: spaceAssignedRoles,
      isReadOnly: true,
    });

    expect(screen.queryByTestId('bulkActionsContextMenuOpener')).toBeNull();
  });

  it('prevents modification of reserved roles', () => {
    renderTestComponent({
      assignedRoles: spaceAssignedRoles,
      isReadOnly: false,
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
