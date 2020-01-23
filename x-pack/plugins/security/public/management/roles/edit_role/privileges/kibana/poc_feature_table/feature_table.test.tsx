/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { ReactWrapper } from 'enzyme';
import {
  EuiTableRow,
  EuiButtonGroup,
  EuiButtonGroupProps,
  EuiCheckbox,
  EuiCheckboxProps,
} from '@elastic/eui';
import { findTestSubject } from 'test_utils/find_test_subject';
import { FeatureTable } from './feature_table';
import { Role } from '../../../../../../../common/model';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { POCPrivilegeCalculator } from '../poc_privilege_calculator';
import { kibanaFeatures } from '../__fixtures__/kibana_features';
import { Feature } from '../../../../../../../../features/public';
import { createKibanaPrivileges } from '../__fixtures__/kibana_privileges';
import { SubFeatureForm } from './sub_feature_form';

function getDisplayedPrivileges(wrapper: ReactWrapper<any>) {
  const allExpanderButtons = findTestSubject(wrapper, 'expandFeaturePrivilegeRow');
  allExpanderButtons.forEach(button => button.simulate('click'));

  // each expanded row renders its own `EuiTableRow`, so there are 2 rows
  // for each feature: one for the primary feature privilege, and one for the sub privilege form
  const rows = wrapper
    .find(EuiTableRow)
    // filter out expanded rows where no sub features are available
    .filterWhere(row => findTestSubject(row, 'noSubFeatures').length === 0);

  return rows.reduce((acc, row) => {
    const subFeaturePrivileges = [];
    const subFeatureForm = row.find(SubFeatureForm);
    if (subFeatureForm.length > 0) {
      const { featureId } = subFeatureForm.props();
      const independentPrivileges = (subFeatureForm.find(EuiCheckbox) as ReactWrapper<
        EuiCheckboxProps
      >).reduce((acc2, checkbox) => {
        const { id: privilegeId, checked } = checkbox.props();
        return checked ? [...acc2, privilegeId] : acc2;
      }, [] as string[]);

      const mutuallyExclusivePrivileges = (subFeatureForm.find(EuiButtonGroup) as ReactWrapper<
        EuiButtonGroupProps
      >).reduce((acc2, subPrivButtonGroup) => {
        const { idSelected: selectedSubPrivilege } = subPrivButtonGroup.props();
        return selectedSubPrivilege && selectedSubPrivilege !== 'none'
          ? [...acc2, selectedSubPrivilege]
          : acc2;
      }, [] as string[]);

      subFeaturePrivileges.push(...independentPrivileges, ...mutuallyExclusivePrivileges);

      return {
        ...acc,
        [featureId]: {
          ...acc[featureId],
          subFeaturePrivileges,
        },
      };
    } else {
      const buttonGroup = row.find(EuiButtonGroup);
      const { name, idSelected } = buttonGroup.props();
      expect(name).toBeDefined();
      expect(idSelected).toBeDefined();

      const featureId = name!.substr(`featurePrivilege_`.length);
      const primaryFeaturePrivilege = idSelected!.substr(`${featureId}_`.length);

      return {
        ...acc,
        [featureId]: {
          ...acc[featureId],
          primaryFeaturePrivilege,
        },
      };
    }
  }, {} as Record<string, { primaryFeaturePrivilege: string; subFeaturePrivileges: string[] }>);
}

const createRole = (kibana: Role['kibana'] = []): Role => {
  return {
    name: 'my_role',
    elasticsearch: { cluster: [], run_as: [], indices: [] },
    kibana,
  };
};

interface TestConfig {
  features: Feature[];
  role: Role;
  spacesIndex: number;
}
const setup = (config: TestConfig) => {
  const kibanaPrivileges = createKibanaPrivileges(config.features);
  const calculator = new POCPrivilegeCalculator(kibanaPrivileges);
  const onChange = jest.fn();
  const onChangeAll = jest.fn();
  const wrapper = mountWithIntl(
    <FeatureTable
      role={config.role}
      privilegeCalculator={calculator}
      kibanaPrivileges={kibanaPrivileges}
      onChange={onChange}
      onChangeAll={onChangeAll}
      spacesIndex={config.spacesIndex}
    />
  );

  const displayedPrivileges = getDisplayedPrivileges(wrapper);

  return {
    wrapper,
    onChange,
    onChangeAll,
    displayedPrivileges,
  };
};

describe('FeatureTable', () => {
  it('renders with no granted privileges for an empty role', () => {
    const role = createRole([
      {
        spaces: [],
        base: [],
        feature: {},
      },
    ]);

    const { displayedPrivileges } = setup({
      role,
      features: kibanaFeatures,
      spacesIndex: 0,
    });

    expect(displayedPrivileges).toMatchInlineSnapshot(`
      Object {
        "excluded_from_base": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "no_sub_features": Object {
          "primaryFeaturePrivilege": "none",
        },
        "with_excluded_sub_features": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "with_sub_features": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
      }
    `);
  });

  it('renders with all privileges granted at the space when global base privilege is "all"', () => {
    const role = createRole([
      {
        spaces: ['*'],
        base: ['all'],
        feature: {},
      },
      {
        spaces: ['foo'],
        base: [],
        feature: {},
      },
    ]);

    const { displayedPrivileges } = setup({ role, features: kibanaFeatures, spacesIndex: 1 });
    expect(displayedPrivileges).toMatchInlineSnapshot(`
      Object {
        "excluded_from_base": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "no_sub_features": Object {
          "primaryFeaturePrivilege": "all",
        },
        "with_excluded_sub_features": Object {
          "primaryFeaturePrivilege": "all",
          "subFeaturePrivileges": Array [],
        },
        "with_sub_features": Object {
          "primaryFeaturePrivilege": "all",
          "subFeaturePrivileges": Array [
            "cool_toggle_1",
            "cool_all",
          ],
        },
      }
    `);
  });

  it('renders with all privileges granted at the space when space base privilege is "all"', () => {
    const role = createRole([
      {
        spaces: ['*'],
        base: ['read'],
        feature: {},
      },
      {
        spaces: ['foo'],
        base: ['all'],
        feature: {},
      },
    ]);
    const { displayedPrivileges } = setup({ role, features: kibanaFeatures, spacesIndex: 1 });
    expect(displayedPrivileges).toMatchInlineSnapshot(`
      Object {
        "excluded_from_base": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "no_sub_features": Object {
          "primaryFeaturePrivilege": "all",
        },
        "with_excluded_sub_features": Object {
          "primaryFeaturePrivilege": "all",
          "subFeaturePrivileges": Array [],
        },
        "with_sub_features": Object {
          "primaryFeaturePrivilege": "all",
          "subFeaturePrivileges": Array [
            "cool_toggle_1",
            "cool_toggle_2",
            "cool_all",
          ],
        },
      }
    `);
  });
});
