/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBadge, EuiInMemoryTable } from '@elastic/eui';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ReactWrapper } from 'enzyme';
import { PrivilegeSpaceTable } from './privilege_space_table';
import { PrivilegeDisplay } from './privilege_display';
import { Role, RoleKibanaPrivilege } from '../../../../../../../common/model';
import { createKibanaPrivileges } from '../../../../__fixtures__/kibana_privileges';
import { PrivilegeFormCalculator } from '../privilege_form_calculator';
import { Feature } from '../../../../../../../../features/public';
import { findTestSubject } from 'test_utils/find_test_subject';

interface TableRow {
  spaces: string[];
  privileges: {
    summary: string;
  };
}

const features = [
  new Feature({
    id: 'normal',
    name: 'normal feature',
    app: [],
    privileges: {
      all: {
        savedObject: { all: [], read: [] },
        ui: ['normal-feature-all', 'normal-feature-read'],
      },
      read: {
        savedObject: { all: [], read: [] },
        ui: ['normal-feature-read'],
      },
    },
  }),
  new Feature({
    id: 'normal_with_sub',
    name: 'normal feature with sub features',
    app: [],
    privileges: {
      all: {
        savedObject: { all: [], read: [] },
        ui: ['normal-feature-all', 'normal-feature-read'],
      },
      read: {
        savedObject: { all: [], read: [] },
        ui: ['normal-feature-read'],
      },
    },
    subFeatures: [
      {
        name: 'sub feature',
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                id: 'normal_sub_all',
                name: 'normal sub feature privilege',
                includeIn: 'all',
                savedObject: { all: [], read: [] },
                ui: ['normal-sub-all', 'normal-sub-read'],
              },
              {
                id: 'normal_sub_read',
                name: 'normal sub feature read privilege',
                includeIn: 'read',
                savedObject: { all: [], read: [] },
                ui: ['normal-sub-read'],
              },
            ],
          },
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'excluded_sub_priv',
                name: 'excluded sub feature privilege',
                includeIn: 'none',
                savedObject: { all: [], read: [] },
                ui: ['excluded-sub-priv'],
              },
            ],
          },
        ],
      },
    ],
  }),
  new Feature({
    id: 'bothPrivilegesExcludedFromBase',
    name: 'bothPrivilegesExcludedFromBase',
    app: [],
    privileges: {
      all: {
        excludeFromBasePrivileges: true,
        savedObject: { all: [], read: [] },
        ui: ['both-privileges-excluded-from-base-all', 'both-privileges-excluded-from-base-read'],
      },
      read: {
        excludeFromBasePrivileges: true,
        savedObject: { all: [], read: [] },
        ui: ['both-privileges-excluded-from-base-read'],
      },
    },
  }),
  new Feature({
    id: 'allPrivilegeExcludedFromBase',
    name: 'allPrivilegeExcludedFromBase',
    app: [],
    privileges: {
      all: {
        excludeFromBasePrivileges: true,
        savedObject: { all: [], read: [] },
        ui: ['all-privilege-excluded-from-base-all', 'all-privilege-excluded-from-base-read'],
      },
      read: {
        savedObject: { all: [], read: [] },
        ui: ['all-privilege-excluded-from-base-read'],
      },
    },
  }),
];

const buildProps = (roleKibanaPrivileges: RoleKibanaPrivilege[]): PrivilegeSpaceTable['props'] => {
  const kibanaPrivileges = createKibanaPrivileges(features);
  const role = {
    name: 'test role',
    elasticsearch: {
      cluster: ['all'],
      indices: [] as any[],
      run_as: [] as string[],
    },
    kibana: roleKibanaPrivileges,
  };
  return {
    role,
    privilegeCalculator: new PrivilegeFormCalculator(kibanaPrivileges, role),
    onChange: (r: Role) => {},
    onEdit: (spacesIndex: number) => {},
    displaySpaces: [
      {
        id: 'default',
        name: 'Default',
        description: '',
        disabledFeatures: [],
        _reserved: true,
      },
      {
        id: 'marketing',
        name: 'Marketing',
        description: '',
        disabledFeatures: [],
      },
    ],
  };
};

const getTableFromComponent = (
  component: ReactWrapper<any, Readonly<{}>, React.Component<{}, {}, any>>
): TableRow[] => {
  const table = component.find(EuiInMemoryTable);
  const rows = table.find('tr');
  const dataRows = rows.slice(1);
  return dataRows.reduce((acc, row) => {
    const cells = row.find('td');
    const spacesCell = cells.at(0);
    const spacesBadge = spacesCell.find(EuiBadge);
    const privilegesCell = cells.at(1);
    const privilegesDisplay = privilegesCell.find(PrivilegeDisplay);
    return [
      ...acc,
      {
        spaces: spacesBadge.map((badge) => badge.text().trim()),
        privileges: {
          summary: privilegesDisplay.text().trim(),
          overridden:
            findTestSubject(row as ReactWrapper<any>, 'spaceTablePrivilegeSupersededWarning')
              .length > 0,
        },
      },
    ];
  }, [] as TableRow[]);
};

describe('only global', () => {
  it('base all', () => {
    const props = buildProps([{ spaces: ['*'], base: ['all'], feature: {} }]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
    ]);
  });

  it('base read', () => {
    const props = buildProps([{ spaces: ['*'], base: ['read'], feature: {} }]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
    ]);
  });

  it('normal feature privilege all', () => {
    const props = buildProps([{ spaces: ['*'], base: [], feature: { normal: ['all'] } }]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('normal feature privilege read', () => {
    const props = buildProps([{ spaces: ['*'], base: [], feature: { normal: ['read'] } }]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('normal feature privilege minimal_all', () => {
    const props = buildProps([
      { spaces: ['*'], base: [], feature: { normal_with_sub: ['minimal_all'] } },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('normal feature privilege minimal_all and normal_sub_read', () => {
    const props = buildProps([
      { spaces: ['*'], base: [], feature: { normal_with_sub: ['minimal_all', 'normal_sub_read'] } },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('bothPrivilegesExcludedFromBase feature privilege all', () => {
    const props = buildProps([
      { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('bothPrivilegesExcludedFromBase feature privilege read', () => {
    const props = buildProps([
      { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('allPrivilegeExcludedFromBase feature privilege all', () => {
    const props = buildProps([
      { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('allPrivilegeExcludedFromBase feature privilege read', () => {
    const props = buildProps([
      { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });
});

describe('only default and marketing space', () => {
  it('base all', () => {
    const props = buildProps([{ spaces: ['default', 'marketing'], base: ['all'], feature: {} }]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
    ]);
  });

  it('base read', () => {
    const props = buildProps([{ spaces: ['default', 'marketing'], base: ['read'], feature: {} }]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: false } },
    ]);
  });

  it('normal feature privilege all', () => {
    const props = buildProps([
      { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('normal feature privilege read', () => {
    const props = buildProps([
      { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('normal feature privilege minimal_all', () => {
    const props = buildProps([
      { spaces: ['default', 'marketing'], base: [], feature: { normal_with_sub: ['minimal_all'] } },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('normal feature privilege minimal_all and normal_sub_read', () => {
    const props = buildProps([
      {
        spaces: ['default', 'marketing'],
        base: [],
        feature: { normal_with_sub: ['minimal_all', 'normal_sub_read'] },
      },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('bothPrivilegesExcludedFromBase feature privilege all', () => {
    const props = buildProps([
      {
        spaces: ['default', 'marketing'],
        base: [],
        feature: { bothPrivilegesExcludedFromBase: ['all'] },
      },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('bothPrivilegesExcludedFromBase feature privilege read', () => {
    const props = buildProps([
      {
        spaces: ['default', 'marketing'],
        base: [],
        feature: { bothPrivilegesExcludedFromBase: ['read'] },
      },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('allPrivilegeExcludedFromBase feature privilege all', () => {
    const props = buildProps([
      {
        spaces: ['default', 'marketing'],
        base: [],
        feature: { allPrivilegeExcludedFromBase: ['all'] },
      },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('allPrivilegeExcludedFromBase feature privilege read', () => {
    const props = buildProps([
      {
        spaces: ['default', 'marketing'],
        base: [],
        feature: { allPrivilegeExcludedFromBase: ['read'] },
      },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });
});

describe('global base all', () => {
  describe('default and marketing space', () => {
    it('base all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        { spaces: ['default', 'marketing'], base: ['all'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
      ]);
    });

    it('base read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        { spaces: ['default', 'marketing'], base: ['read'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: true } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: true } },
      ]);
    });

    it('normal feature privilege minimal_all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { normal_with_sub: ['minimal_all'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: true } },
      ]);
    });

    it('normal feature privilege minimal_all and normal_sub_read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { normal_with_sub: ['minimal_all', 'normal_sub_read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: true } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['all'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['all'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });
  });
});

describe('global base read', () => {
  describe('default and marketing space', () => {
    it('base all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        { spaces: ['default', 'marketing'], base: ['all'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
      ]);
    });

    it('base read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        { spaces: ['default', 'marketing'], base: ['read'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: false } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege minimal_read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { normal_with_sub: ['minimal_read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: true } },
      ]);
    });

    it('normal feature privilege minimal_read and normal_sub_read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { normal_with_sub: ['minimal_read', 'normal_sub_read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['all'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['all'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });
  });
});

describe('global normal feature privilege all', () => {
  describe('default and marketing space', () => {
    it('base all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['all'] } },
        { spaces: ['default', 'marketing'], base: ['all'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
      ]);
    });

    it('base read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['all'] } },
        { spaces: ['default', 'marketing'], base: ['read'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: false } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['all'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['all'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: true } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['all'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['all'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });
  });
});

describe('global normal feature privilege read', () => {
  describe('default and marketing space', () => {
    it('base all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['read'] } },
        { spaces: ['default', 'marketing'], base: ['all'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
      ]);
    });

    it('base read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['read'] } },
        { spaces: ['default', 'marketing'], base: ['read'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: false } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['read'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['read'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['all'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['all'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });
  });
});

describe('global bothPrivilegesExcludedFromBase feature privilege all', () => {
  describe('default and marketing space', () => {
    it('base all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['all'] } },
        { spaces: ['default', 'marketing'], base: ['all'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
      ]);
    });

    it('base read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['all'] } },
        { spaces: ['default', 'marketing'], base: ['read'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: false } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['all'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['all'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['all'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: true } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['all'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });
  });
});

describe('global bothPrivilegesExcludedFromBase feature privilege read', () => {
  describe('default and marketing space', () => {
    it('base all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
        { spaces: ['default', 'marketing'], base: ['all'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
      ]);
    });

    it('base read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
        { spaces: ['default', 'marketing'], base: ['read'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: false } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['all'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['all'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });
  });
});

describe('global allPrivilegeExcludedFromBase feature privilege all', () => {
  describe('default and marketing space', () => {
    it('base all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['all'] } },
        { spaces: ['default', 'marketing'], base: ['all'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
      ]);
    });

    it('base read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['all'] } },
        { spaces: ['default', 'marketing'], base: ['read'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: false } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['all'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['all'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['all'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['all'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: true } },
      ]);
    });
  });
});

describe('global allPrivilegeExcludedFromBase feature privilege read', () => {
  describe('default and marketing space', () => {
    it('base all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
        { spaces: ['default', 'marketing'], base: ['all'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
      ]);
    });

    it('base read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
        { spaces: ['default', 'marketing'], base: ['read'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: false } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['all'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);

      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['all'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['read'] },
        },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });
  });
});
