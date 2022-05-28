/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup } from '@elastic/eui';
import React from 'react';

import type { Space } from '@kbn/spaces-plugin/public';
import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';

import type { Role } from '../../../../../../../common/model';
import { createFeature, kibanaFeatures } from '../../../../__fixtures__/kibana_features';
import { createKibanaPrivileges } from '../../../../__fixtures__/kibana_privileges';
import { FeatureTable } from '../feature_table';
import { getDisplayedFeaturePrivileges } from '../feature_table/__fixtures__';
import { PrivilegeSpaceForm } from './privilege_space_form';
import { SpaceSelector } from './space_selector';

const createRole = (kibana: Role['kibana'] = []): Role => {
  return {
    name: 'my_role',
    elasticsearch: { cluster: [], run_as: [], indices: [] },
    kibana,
  };
};

const displaySpaces: Space[] = [
  {
    id: 'foo',
    name: 'Foo Space',
    disabledFeatures: [],
  },
  {
    id: 'default',
    name: 'Default Space',
    disabledFeatures: [],
  },
  {
    id: '*',
    name: 'Global',
    disabledFeatures: [],
  },
];

describe('PrivilegeSpaceForm', () => {
  it('renders an empty form when the role contains no Kibana privileges', () => {
    const role = createRole();
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const wrapper = mountWithIntl(
      <PrivilegeSpaceForm
        role={role}
        spaces={displaySpaces}
        kibanaPrivileges={kibanaPrivileges}
        canCustomizeSubFeaturePrivileges={true}
        onChange={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(
      wrapper.find(EuiButtonGroup).filter('[name="basePrivilegeButtonGroup"]').props().idSelected
    ).toEqual(`basePrivilege_custom`);
    expect(wrapper.find(FeatureTable).props().disabled).toEqual(true);
    expect(getDisplayedFeaturePrivileges(wrapper)).toMatchInlineSnapshot(`
      Object {
        "excluded_from_base": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "no_sub_features": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
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

    expect(findTestSubject(wrapper, 'spaceFormGlobalPermissionsSupersedeWarning')).toHaveLength(0);
  });

  it('renders when a base privilege is selected', () => {
    const role = createRole([
      {
        base: ['all'],
        feature: {},
        spaces: ['foo'],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const wrapper = mountWithIntl(
      <PrivilegeSpaceForm
        role={role}
        spaces={displaySpaces}
        kibanaPrivileges={kibanaPrivileges}
        canCustomizeSubFeaturePrivileges={true}
        privilegeIndex={0}
        onChange={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(
      wrapper.find(EuiButtonGroup).filter('[name="basePrivilegeButtonGroup"]').props().idSelected
    ).toEqual(`basePrivilege_all`);
    expect(wrapper.find(FeatureTable).props().disabled).toEqual(true);
    expect(getDisplayedFeaturePrivileges(wrapper)).toMatchInlineSnapshot(`
      Object {
        "excluded_from_base": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "no_sub_features": Object {
          "primaryFeaturePrivilege": "all",
          "subFeaturePrivileges": Array [],
        },
        "with_excluded_sub_features": Object {
          "primaryFeaturePrivilege": "all",
          "subFeaturePrivileges": Array [],
        },
        "with_sub_features": Object {
          "primaryFeaturePrivilege": "all",
          "subFeaturePrivileges": Array [
            "with_sub_features_cool_toggle_1",
            "with_sub_features_cool_toggle_2",
            "cool_all",
          ],
        },
      }
    `);

    expect(findTestSubject(wrapper, 'spaceFormGlobalPermissionsSupersedeWarning')).toHaveLength(0);
  });

  it('renders when a feature privileges are selected', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['read'],
        },
        spaces: ['foo'],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const wrapper = mountWithIntl(
      <PrivilegeSpaceForm
        role={role}
        spaces={displaySpaces}
        kibanaPrivileges={kibanaPrivileges}
        canCustomizeSubFeaturePrivileges={true}
        privilegeIndex={0}
        onChange={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(
      wrapper.find(EuiButtonGroup).filter('[name="basePrivilegeButtonGroup"]').props().idSelected
    ).toEqual(`basePrivilege_custom`);
    expect(wrapper.find(FeatureTable).props().disabled).toEqual(false);
    expect(getDisplayedFeaturePrivileges(wrapper)).toMatchInlineSnapshot(`
      Object {
        "excluded_from_base": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "no_sub_features": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "with_excluded_sub_features": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "with_sub_features": Object {
          "primaryFeaturePrivilege": "read",
          "subFeaturePrivileges": Array [
            "with_sub_features_cool_toggle_2",
            "cool_read",
          ],
        },
      }
    `);

    expect(findTestSubject(wrapper, 'spaceFormGlobalPermissionsSupersedeWarning')).toHaveLength(0);
  });

  it('renders a warning when configuring a global privilege after space privileges are already defined', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['read'],
        },
        spaces: ['foo'],
      },
      {
        base: [],
        feature: {
          with_sub_features: ['all'],
        },
        spaces: ['*'],
      },
    ]);

    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const wrapper = mountWithIntl(
      <PrivilegeSpaceForm
        role={role}
        spaces={displaySpaces}
        kibanaPrivileges={kibanaPrivileges}
        canCustomizeSubFeaturePrivileges={true}
        onChange={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    wrapper.find(SpaceSelector).props().onChange(['*']);

    wrapper.update();

    expect(findTestSubject(wrapper, 'globalPrivilegeWarning')).toHaveLength(1);
  });

  it('renders a warning when space privileges are less permissive than configured global privileges', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['read'],
        },
        spaces: ['foo'],
      },
      {
        base: [],
        feature: {
          with_sub_features: ['all'],
        },
        spaces: ['*'],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const wrapper = mountWithIntl(
      <PrivilegeSpaceForm
        role={role}
        spaces={displaySpaces}
        kibanaPrivileges={kibanaPrivileges}
        canCustomizeSubFeaturePrivileges={true}
        privilegeIndex={0}
        onChange={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(
      wrapper.find(EuiButtonGroup).filter('[name="basePrivilegeButtonGroup"]').props().idSelected
    ).toEqual(`basePrivilege_custom`);

    expect(wrapper.find(FeatureTable).props().disabled).toEqual(false);
    expect(getDisplayedFeaturePrivileges(wrapper)).toMatchInlineSnapshot(`
      Object {
        "excluded_from_base": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "no_sub_features": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "with_excluded_sub_features": Object {
          "primaryFeaturePrivilege": "none",
          "subFeaturePrivileges": Array [],
        },
        "with_sub_features": Object {
          "primaryFeaturePrivilege": "read",
          "subFeaturePrivileges": Array [
            "with_sub_features_cool_toggle_2",
            "cool_read",
          ],
        },
      }
    `);

    expect(findTestSubject(wrapper, 'spaceFormGlobalPermissionsSupersedeWarning')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'globalPrivilegeWarning')).toHaveLength(0);
  });

  it('allows all feature privileges to be changed via "change read"', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['all', 'with_sub_features_cool_toggle_2', 'cool_read'],
        },
        spaces: ['foo'],
      },
      {
        base: [],
        feature: {
          with_sub_features: ['all'],
        },
        spaces: ['bar'],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const onChange = jest.fn();

    const wrapper = mountWithIntl(
      <PrivilegeSpaceForm
        role={role}
        spaces={displaySpaces}
        kibanaPrivileges={kibanaPrivileges}
        canCustomizeSubFeaturePrivileges={true}
        privilegeIndex={0}
        onChange={onChange}
        onCancel={jest.fn()}
      />
    );

    findTestSubject(wrapper, 'changeAllPrivilegesButton').simulate('click');
    findTestSubject(wrapper, 'changeAllPrivileges-read').simulate('click');
    findTestSubject(wrapper, 'createSpacePrivilegeButton').simulate('click');

    expect(onChange).toHaveBeenCalledWith(
      createRole([
        {
          base: [],
          feature: {
            excluded_from_base: ['read'],
            with_excluded_sub_features: ['read'],
            no_sub_features: ['read'],
            with_sub_features: ['read'],
          },
          spaces: ['foo'],
        },
        // this set remains unchanged from the original
        {
          base: [],
          feature: {
            with_sub_features: ['all'],
          },
          spaces: ['bar'],
        },
      ])
    );
  });

  it('passes the `canCustomizeSubFeaturePrivileges` prop to the FeatureTable', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['all'],
        },
        spaces: ['foo'],
      },
    ]);
    const kibanaPrivileges = createKibanaPrivileges(kibanaFeatures);

    const onChange = jest.fn();

    const canCustomize = Symbol('can customize') as unknown as boolean;

    const wrapper = mountWithIntl(
      <PrivilegeSpaceForm
        role={role}
        spaces={displaySpaces}
        kibanaPrivileges={kibanaPrivileges}
        canCustomizeSubFeaturePrivileges={canCustomize}
        privilegeIndex={0}
        onChange={onChange}
        onCancel={jest.fn()}
      />
    );

    expect(wrapper.find(FeatureTable).props().canCustomizeSubFeaturePrivileges).toBe(canCustomize);
  });

  describe('Feature with a disabled `read` privilege', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['all', 'with_sub_features_cool_toggle_2', 'cool_read'],
        },
        spaces: ['foo'],
      },
      {
        base: [],
        feature: {
          with_sub_features: ['all'],
        },
        spaces: ['bar'],
      },
    ]);
    const extendedKibanaFeatures = [
      ...kibanaFeatures,
      createFeature({
        id: 'no_sub_features_disabled_read',
        name: 'Feature 1: No Sub Features and read disabled',
        disabledReadPrivilege: true,
      }),
    ];
    const kibanaPrivileges = createKibanaPrivileges(extendedKibanaFeatures);
    const onChange = jest.fn();
    beforeEach(() => {
      onChange.mockReset();
    });
    it('still allow other features privileges to be changed via "change read"', () => {
      const wrapper = mountWithIntl(
        <PrivilegeSpaceForm
          role={role}
          spaces={displaySpaces}
          kibanaPrivileges={kibanaPrivileges}
          canCustomizeSubFeaturePrivileges={true}
          privilegeIndex={0}
          onChange={onChange}
          onCancel={jest.fn()}
        />
      );

      findTestSubject(wrapper, 'changeAllPrivilegesButton').simulate('click');
      findTestSubject(wrapper, 'changeAllPrivileges-read').simulate('click');
      findTestSubject(wrapper, 'createSpacePrivilegeButton').simulate('click');

      expect(Object.keys(onChange.mock.calls[0][0].kibana[0].feature)).not.toContain(
        'no_sub_features_disabled_read'
      );
      expect(onChange).toHaveBeenCalledWith(
        createRole([
          {
            base: [],
            feature: {
              excluded_from_base: ['read'],
              with_excluded_sub_features: ['read'],
              no_sub_features: ['read'],
              with_sub_features: ['read'],
            },
            spaces: ['foo'],
          },
          // this set remains unchanged from the original
          {
            base: [],
            feature: {
              with_sub_features: ['all'],
            },
            spaces: ['bar'],
          },
        ])
      );
    });

    it('still allow all privileges to be changed via "change all"', () => {
      const wrapper = mountWithIntl(
        <PrivilegeSpaceForm
          role={role}
          spaces={displaySpaces}
          kibanaPrivileges={kibanaPrivileges}
          canCustomizeSubFeaturePrivileges={true}
          privilegeIndex={0}
          onChange={onChange}
          onCancel={jest.fn()}
        />
      );

      findTestSubject(wrapper, 'changeAllPrivilegesButton').simulate('click');
      findTestSubject(wrapper, 'changeAllPrivileges-all').simulate('click');
      findTestSubject(wrapper, 'createSpacePrivilegeButton').simulate('click');

      expect(onChange).toHaveBeenCalledWith(
        createRole([
          {
            base: [],
            feature: {
              excluded_from_base: ['all'],
              with_excluded_sub_features: ['all'],
              no_sub_features: ['all'],
              no_sub_features_disabled_read: ['all'],
              with_sub_features: ['all'],
            },
            spaces: ['foo'],
          },
          // this set remains unchanged from the original
          {
            base: [],
            feature: {
              with_sub_features: ['all'],
            },
            spaces: ['bar'],
          },
        ])
      );
    });
  });

  describe('Feature with requireAllSpaces on all privileges', () => {
    const role = createRole([
      {
        base: [],
        feature: {
          with_sub_features: ['all', 'with_sub_features_cool_toggle_2', 'cool_read'],
        },
        spaces: ['foo'],
      },
      {
        base: [],
        feature: {
          with_sub_features: ['all'],
        },
        spaces: ['bar'],
      },
    ]);
    const extendedKibanaFeatures = [
      ...kibanaFeatures,
      createFeature({
        id: 'no_sub_features_require_all_space',
        name: 'Feature 1: No Sub Features and all privilege require all space',
        requireAllSpacesOnAllPrivilege: true,
      }),
    ];
    const kibanaPrivileges = createKibanaPrivileges(extendedKibanaFeatures);

    const onChange = jest.fn();

    beforeEach(() => {
      onChange.mockReset();
    });

    it('still allow all features privileges to be changed via "change read" in foo space', () => {
      const wrapper = mountWithIntl(
        <PrivilegeSpaceForm
          role={role}
          spaces={displaySpaces}
          kibanaPrivileges={kibanaPrivileges}
          canCustomizeSubFeaturePrivileges={true}
          privilegeIndex={0}
          onChange={onChange}
          onCancel={jest.fn()}
        />
      );

      findTestSubject(wrapper, 'changeAllPrivilegesButton').simulate('click');
      findTestSubject(wrapper, 'changeAllPrivileges-read').simulate('click');
      findTestSubject(wrapper, 'createSpacePrivilegeButton').simulate('click');

      expect(onChange).toHaveBeenCalledWith(
        createRole([
          {
            base: [],
            feature: {
              excluded_from_base: ['read'],
              with_excluded_sub_features: ['read'],
              no_sub_features: ['read'],
              no_sub_features_require_all_space: ['read'],
              with_sub_features: ['read'],
            },
            spaces: ['foo'],
          },
          // this set remains unchanged from the original
          {
            base: [],
            feature: {
              with_sub_features: ['all'],
            },
            spaces: ['bar'],
          },
        ])
      );
    });

    it('still allow other features privileges to be changed via "change all" in foo space', () => {
      const wrapper = mountWithIntl(
        <PrivilegeSpaceForm
          role={role}
          spaces={displaySpaces}
          kibanaPrivileges={kibanaPrivileges}
          canCustomizeSubFeaturePrivileges={true}
          privilegeIndex={0}
          onChange={onChange}
          onCancel={jest.fn()}
        />
      );

      findTestSubject(wrapper, 'changeAllPrivilegesButton').simulate('click');
      findTestSubject(wrapper, 'changeAllPrivileges-all').simulate('click');
      findTestSubject(wrapper, 'createSpacePrivilegeButton').simulate('click');

      expect(Object.keys(onChange.mock.calls[0][0].kibana[0].feature)).not.toContain(
        'no_sub_features_require_all_space'
      );
      expect(onChange).toHaveBeenCalledWith(
        createRole([
          {
            base: [],
            feature: {
              excluded_from_base: ['all'],
              with_excluded_sub_features: ['all'],
              no_sub_features: ['all'],
              with_sub_features: ['all'],
            },
            spaces: ['foo'],
          },
          // this set remains unchanged from the original
          {
            base: [],
            feature: {
              with_sub_features: ['all'],
            },
            spaces: ['bar'],
          },
        ])
      );
    });

    it('still allow all features privileges to be changed via "change all" in all space', () => {
      const roleAllSpace = createRole([
        {
          base: [],
          feature: {
            with_sub_features: ['all', 'with_sub_features_cool_toggle_2', 'cool_read'],
          },
          spaces: ['*'],
        },
        {
          base: [],
          feature: {
            with_sub_features: ['all'],
          },
          spaces: ['bar'],
        },
      ]);
      const wrapper = mountWithIntl(
        <PrivilegeSpaceForm
          role={roleAllSpace}
          spaces={displaySpaces}
          kibanaPrivileges={kibanaPrivileges}
          canCustomizeSubFeaturePrivileges={true}
          privilegeIndex={0}
          onChange={onChange}
          onCancel={jest.fn()}
        />
      );

      findTestSubject(wrapper, 'changeAllPrivilegesButton').simulate('click');
      findTestSubject(wrapper, 'changeAllPrivileges-all').simulate('click');
      findTestSubject(wrapper, 'createSpacePrivilegeButton').simulate('click');

      expect(onChange).toHaveBeenCalledWith(
        createRole([
          {
            base: [],
            feature: {
              excluded_from_base: ['all'],
              with_excluded_sub_features: ['all'],
              no_sub_features: ['all'],
              no_sub_features_require_all_space: ['all'],
              with_sub_features: ['all'],
            },
            spaces: ['*'],
          },
          // this set remains unchanged from the original
          {
            base: [],
            feature: {
              with_sub_features: ['all'],
            },
            spaces: ['bar'],
          },
        ])
      );
    });

    test.todo(
      'should unset the feature privilege and all sub-feature privileges when "* All spaces" is removed'
    );
  });
});
