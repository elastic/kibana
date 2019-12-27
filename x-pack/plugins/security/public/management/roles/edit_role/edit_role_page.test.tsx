/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactWrapper } from 'enzyme';
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { UICapabilities } from 'ui/capabilities';
import { Space } from '../../../../../../spaces/common/model/space';
import { Feature } from '../../../../../../../../plugins/features/public';
// These modules should be moved into a common directory
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Actions } from '../../../../../../../../plugins/security/server/authorization/actions';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { privilegesFactory } from '../../../../../../../../plugins/security/server/authorization/privileges';
import { RawKibanaPrivileges, Role } from '../../../../../common/model';
import { EditRolePage } from './edit_role_page';
import { SimplePrivilegeSection } from './privileges/kibana/simple_privilege_section';
import { SpaceAwarePrivilegeSection } from './privileges/kibana/space_aware_privilege_section';
import { TransformErrorSection } from './privileges/kibana/transform_error_section';

const buildFeatures = () => {
  return [
    {
      id: 'feature1',
      name: 'Feature 1',
      icon: 'addDataApp',
      app: ['feature1App'],
      privileges: {
        all: {
          app: ['feature1App'],
          ui: ['feature1-ui'],
          savedObject: {
            all: [],
            read: [],
          },
        },
      },
    },
    {
      id: 'feature2',
      name: 'Feature 2',
      icon: 'addDataApp',
      app: ['feature2App'],
      privileges: {
        all: {
          app: ['feature2App'],
          ui: ['feature2-ui'],
          savedObject: {
            all: ['feature2'],
            read: ['config'],
          },
        },
      },
    },
  ] as Feature[];
};

const buildRawKibanaPrivileges = () => {
  return privilegesFactory(new Actions('unit_test_version'), {
    getFeatures: () => buildFeatures(),
  }).get();
};

const buildBuiltinESPrivileges = () => {
  return {
    cluster: ['all', 'manage', 'monitor'],
    index: ['all', 'read', 'write', 'index'],
  };
};

const buildUICapabilities = (canManageSpaces = true) => {
  return {
    catalogue: {},
    management: {},
    navLinks: {},
    spaces: {
      manage: canManageSpaces,
    },
  } as UICapabilities;
};

const buildSpaces = () => {
  return [
    {
      id: 'default',
      name: 'Default',
      disabledFeatures: [],
      _reserved: true,
    },
    {
      id: 'space_1',
      name: 'Space 1',
      disabledFeatures: [],
    },
    {
      id: 'space_2',
      name: 'Space 2',
      disabledFeatures: ['feature2'],
    },
  ] as Space[];
};

const expectReadOnlyFormButtons = (wrapper: ReactWrapper<any, any>) => {
  expect(wrapper.find('button[data-test-subj="roleFormReturnButton"]')).toHaveLength(1);
  expect(wrapper.find('button[data-test-subj="roleFormSaveButton"]')).toHaveLength(0);
};

const expectSaveFormButtons = (wrapper: ReactWrapper<any, any>) => {
  expect(wrapper.find('button[data-test-subj="roleFormReturnButton"]')).toHaveLength(0);
  expect(wrapper.find('button[data-test-subj="roleFormSaveButton"]')).toHaveLength(1);
};

describe('<EditRolePage />', () => {
  describe('with spaces enabled', () => {
    it('can render a reserved role', () => {
      const role: Role = {
        name: 'superuser',
        metadata: {
          _reserved: true,
        },
        elasticsearch: {
          cluster: ['all'],
          indices: [],
          run_as: ['*'],
        },
        kibana: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
        ],
      };

      const features: Feature[] = buildFeatures();
      const mockHttpClient = jest.fn();
      const indexPatterns: string[] = ['foo*', 'bar*'];
      const kibanaPrivileges: RawKibanaPrivileges = buildRawKibanaPrivileges();
      const builtinESPrivileges = buildBuiltinESPrivileges();
      const spaces: Space[] = buildSpaces();
      const uiCapabilities: UICapabilities = buildUICapabilities();

      const wrapper = mountWithIntl(
        <EditRolePage
          action={'edit'}
          role={role}
          runAsUsers={[]}
          allowDocumentLevelSecurity={true}
          allowFieldLevelSecurity={true}
          features={features}
          httpClient={mockHttpClient}
          indexPatterns={indexPatterns}
          kibanaPrivileges={kibanaPrivileges}
          builtinESPrivileges={builtinESPrivileges}
          spaces={spaces}
          spacesEnabled={true}
          uiCapabilities={uiCapabilities}
        />
      );

      expect(wrapper.find('[data-test-subj="reservedRoleBadgeTooltip"]')).toHaveLength(1);
      expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(1);
      expect(wrapper.find('[data-test-subj="userCannotManageSpacesCallout"]')).toHaveLength(0);
      expectReadOnlyFormButtons(wrapper);
    });

    it('can render a user defined role', () => {
      const role: Role = {
        name: 'my custom role',
        metadata: {},
        elasticsearch: {
          cluster: ['all'],
          indices: [],
          run_as: ['*'],
        },
        kibana: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
        ],
      };

      const features: Feature[] = buildFeatures();
      const mockHttpClient = jest.fn();
      const indexPatterns: string[] = ['foo*', 'bar*'];
      const kibanaPrivileges: RawKibanaPrivileges = buildRawKibanaPrivileges();
      const builtinESPrivileges = buildBuiltinESPrivileges();
      const spaces: Space[] = buildSpaces();
      const uiCapabilities: UICapabilities = buildUICapabilities();

      const wrapper = mountWithIntl(
        <EditRolePage
          action={'edit'}
          role={role}
          runAsUsers={[]}
          allowDocumentLevelSecurity={true}
          allowFieldLevelSecurity={true}
          features={features}
          httpClient={mockHttpClient}
          indexPatterns={indexPatterns}
          kibanaPrivileges={kibanaPrivileges}
          builtinESPrivileges={builtinESPrivileges}
          spaces={spaces}
          spacesEnabled={true}
          uiCapabilities={uiCapabilities}
        />
      );

      expect(wrapper.find('[data-test-subj="reservedRoleBadgeTooltip"]')).toHaveLength(0);
      expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(1);
      expect(wrapper.find('[data-test-subj="userCannotManageSpacesCallout"]')).toHaveLength(0);
      expectSaveFormButtons(wrapper);
    });

    it('can render when creating a new role', () => {
      // @ts-ignore
      const role: Role = {
        metadata: {},
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [],
      };

      const features: Feature[] = buildFeatures();
      const mockHttpClient = jest.fn();
      const indexPatterns: string[] = ['foo*', 'bar*'];
      const kibanaPrivileges: RawKibanaPrivileges = buildRawKibanaPrivileges();
      const builtinESPrivileges = buildBuiltinESPrivileges();
      const spaces: Space[] = buildSpaces();
      const uiCapabilities: UICapabilities = buildUICapabilities();

      const wrapper = mountWithIntl(
        <EditRolePage
          action={'edit'}
          role={role}
          runAsUsers={[]}
          allowDocumentLevelSecurity={true}
          allowFieldLevelSecurity={true}
          features={features}
          httpClient={mockHttpClient}
          indexPatterns={indexPatterns}
          kibanaPrivileges={kibanaPrivileges}
          builtinESPrivileges={builtinESPrivileges}
          spaces={spaces}
          spacesEnabled={true}
          uiCapabilities={uiCapabilities}
        />
      );

      expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(1);
      expect(wrapper.find('[data-test-subj="userCannotManageSpacesCallout"]')).toHaveLength(0);
      expectSaveFormButtons(wrapper);
    });

    it('can render when cloning an existing role', () => {
      const role: Role = {
        metadata: {
          _reserved: false,
        },
        name: '',
        elasticsearch: {
          cluster: ['all', 'manage'],
          indices: [
            {
              names: ['foo*'],
              privileges: ['all'],
              field_security: {
                except: ['f'],
                grant: ['b*'],
              },
            },
          ],
          run_as: ['elastic'],
        },
        kibana: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
        ],
      };

      const features: Feature[] = buildFeatures();
      const mockHttpClient = jest.fn();
      const indexPatterns: string[] = ['foo*', 'bar*'];
      const kibanaPrivileges: RawKibanaPrivileges = buildRawKibanaPrivileges();
      const builtinESPrivileges = buildBuiltinESPrivileges();
      const spaces: Space[] = buildSpaces();
      const uiCapabilities: UICapabilities = buildUICapabilities();

      const wrapper = mountWithIntl(
        <EditRolePage
          action={'clone'}
          role={role}
          runAsUsers={[]}
          allowDocumentLevelSecurity={true}
          allowFieldLevelSecurity={true}
          features={features}
          httpClient={mockHttpClient}
          indexPatterns={indexPatterns}
          kibanaPrivileges={kibanaPrivileges}
          builtinESPrivileges={builtinESPrivileges}
          spaces={spaces}
          spacesEnabled={true}
          uiCapabilities={uiCapabilities}
        />
      );

      expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(1);
      expect(wrapper.find('[data-test-subj="userCannotManageSpacesCallout"]')).toHaveLength(0);
      expectSaveFormButtons(wrapper);
    });

    it('renders an auth error when not authorized to manage spaces', () => {
      const role: Role = {
        name: 'my custom role',
        metadata: {},
        elasticsearch: {
          cluster: ['all'],
          indices: [],
          run_as: ['*'],
        },
        kibana: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
        ],
      };

      const features: Feature[] = buildFeatures();
      const mockHttpClient = jest.fn();
      const indexPatterns: string[] = ['foo*', 'bar*'];
      const kibanaPrivileges: RawKibanaPrivileges = buildRawKibanaPrivileges();
      const builtinESPrivileges = buildBuiltinESPrivileges();
      const spaces: Space[] = buildSpaces();
      const uiCapabilities: UICapabilities = buildUICapabilities(false);

      const wrapper = mountWithIntl(
        <EditRolePage
          action={'edit'}
          role={role}
          runAsUsers={[]}
          allowDocumentLevelSecurity={true}
          allowFieldLevelSecurity={true}
          features={features}
          httpClient={mockHttpClient}
          indexPatterns={indexPatterns}
          kibanaPrivileges={kibanaPrivileges}
          builtinESPrivileges={builtinESPrivileges}
          spaces={spaces}
          spacesEnabled={true}
          uiCapabilities={uiCapabilities}
        />
      );

      expect(wrapper.find('[data-test-subj="reservedRoleBadgeTooltip"]')).toHaveLength(0);

      expect(
        wrapper.find('EuiCallOut[data-test-subj="userCannotManageSpacesCallout"]')
      ).toHaveLength(1);

      expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(1);
      expectSaveFormButtons(wrapper);
    });

    it('renders a partial read-only view when there is a transform error', () => {
      const role: Role = {
        name: 'my custom role',
        metadata: {},
        elasticsearch: {
          cluster: ['all'],
          indices: [],
          run_as: ['*'],
        },
        kibana: [],
        _transform_error: ['kibana'],
      };

      const features: Feature[] = buildFeatures();
      const mockHttpClient = jest.fn();
      const indexPatterns: string[] = ['foo*', 'bar*'];
      const kibanaPrivileges: RawKibanaPrivileges = buildRawKibanaPrivileges();
      const builtinESPrivileges = buildBuiltinESPrivileges();
      const spaces: Space[] = buildSpaces();
      const uiCapabilities: UICapabilities = buildUICapabilities(false);

      const wrapper = mountWithIntl(
        <EditRolePage
          action={'edit'}
          role={role}
          runAsUsers={[]}
          allowDocumentLevelSecurity={true}
          allowFieldLevelSecurity={true}
          features={features}
          httpClient={mockHttpClient}
          indexPatterns={indexPatterns}
          kibanaPrivileges={kibanaPrivileges}
          builtinESPrivileges={builtinESPrivileges}
          spaces={spaces}
          spacesEnabled={true}
          uiCapabilities={uiCapabilities}
        />
      );

      expect(wrapper.find(TransformErrorSection)).toHaveLength(1);
      expectReadOnlyFormButtons(wrapper);
    });
  });

  describe('with spaces disabled', () => {
    it('can render a reserved role', () => {
      const role: Role = {
        name: 'superuser',
        metadata: {
          _reserved: true,
        },
        elasticsearch: {
          cluster: ['all'],
          indices: [],
          run_as: ['*'],
        },
        kibana: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
        ],
      };

      const features: Feature[] = buildFeatures();
      const mockHttpClient = jest.fn();
      const indexPatterns: string[] = ['foo*', 'bar*'];
      const kibanaPrivileges: RawKibanaPrivileges = buildRawKibanaPrivileges();
      const builtinESPrivileges = buildBuiltinESPrivileges();
      const uiCapabilities: UICapabilities = buildUICapabilities();

      const wrapper = mountWithIntl(
        <EditRolePage
          action={'edit'}
          role={role}
          runAsUsers={[]}
          allowDocumentLevelSecurity={true}
          allowFieldLevelSecurity={true}
          features={features}
          httpClient={mockHttpClient}
          indexPatterns={indexPatterns}
          kibanaPrivileges={kibanaPrivileges}
          builtinESPrivileges={builtinESPrivileges}
          spaces={[]}
          spacesEnabled={false}
          uiCapabilities={uiCapabilities}
        />
      );

      expect(wrapper.find('[data-test-subj="reservedRoleBadgeTooltip"]')).toHaveLength(1);
      expect(wrapper.find(SimplePrivilegeSection)).toHaveLength(1);
      expect(wrapper.find('[data-test-subj="userCannotManageSpacesCallout"]')).toHaveLength(0);
      expectReadOnlyFormButtons(wrapper);
    });

    it('can render a user defined role', () => {
      const role: Role = {
        name: 'my custom role',
        metadata: {},
        elasticsearch: {
          cluster: ['all'],
          indices: [],
          run_as: ['*'],
        },
        kibana: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
        ],
      };

      const features: Feature[] = buildFeatures();
      const mockHttpClient = jest.fn();
      const indexPatterns: string[] = ['foo*', 'bar*'];
      const kibanaPrivileges: RawKibanaPrivileges = buildRawKibanaPrivileges();
      const builtinESPrivileges = buildBuiltinESPrivileges();
      const uiCapabilities: UICapabilities = buildUICapabilities();

      const wrapper = mountWithIntl(
        <EditRolePage
          action={'edit'}
          role={role}
          runAsUsers={[]}
          allowDocumentLevelSecurity={true}
          allowFieldLevelSecurity={true}
          features={features}
          httpClient={mockHttpClient}
          indexPatterns={indexPatterns}
          kibanaPrivileges={kibanaPrivileges}
          builtinESPrivileges={builtinESPrivileges}
          spaces={[]}
          spacesEnabled={false}
          uiCapabilities={uiCapabilities}
        />
      );

      expect(wrapper.find('[data-test-subj="reservedRoleBadgeTooltip"]')).toHaveLength(0);
      expect(wrapper.find(SimplePrivilegeSection)).toHaveLength(1);
      expect(wrapper.find('[data-test-subj="userCannotManageSpacesCallout"]')).toHaveLength(0);
      expectSaveFormButtons(wrapper);
    });

    it('can render when creating a new role', () => {
      // @ts-ignore
      const role: Role = {
        metadata: {},
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [],
      };

      const features: Feature[] = buildFeatures();
      const mockHttpClient = jest.fn();
      const indexPatterns: string[] = ['foo*', 'bar*'];
      const kibanaPrivileges: RawKibanaPrivileges = buildRawKibanaPrivileges();
      const builtinESPrivileges = buildBuiltinESPrivileges();
      const uiCapabilities: UICapabilities = buildUICapabilities();

      const wrapper = mountWithIntl(
        <EditRolePage
          action={'edit'}
          role={role}
          runAsUsers={[]}
          allowDocumentLevelSecurity={true}
          allowFieldLevelSecurity={true}
          features={features}
          httpClient={mockHttpClient}
          indexPatterns={indexPatterns}
          kibanaPrivileges={kibanaPrivileges}
          builtinESPrivileges={builtinESPrivileges}
          spaces={[]}
          spacesEnabled={false}
          uiCapabilities={uiCapabilities}
        />
      );

      expect(wrapper.find(SimplePrivilegeSection)).toHaveLength(1);
      expectSaveFormButtons(wrapper);
    });

    it('can render when cloning an existing role', () => {
      const role: Role = {
        metadata: {
          _reserved: false,
        },
        name: '',
        elasticsearch: {
          cluster: ['all', 'manage'],
          indices: [
            {
              names: ['foo*'],
              privileges: ['all'],
              field_security: {
                except: ['f'],
                grant: ['b*'],
              },
            },
          ],
          run_as: ['elastic'],
        },
        kibana: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
        ],
      };

      const features: Feature[] = buildFeatures();
      const mockHttpClient = jest.fn();
      const indexPatterns: string[] = ['foo*', 'bar*'];
      const kibanaPrivileges: RawKibanaPrivileges = buildRawKibanaPrivileges();
      const builtinESPrivileges = buildBuiltinESPrivileges();
      const uiCapabilities: UICapabilities = buildUICapabilities();

      const wrapper = mountWithIntl(
        <EditRolePage
          action={'clone'}
          role={role}
          runAsUsers={[]}
          allowDocumentLevelSecurity={true}
          allowFieldLevelSecurity={true}
          features={features}
          httpClient={mockHttpClient}
          indexPatterns={indexPatterns}
          kibanaPrivileges={kibanaPrivileges}
          builtinESPrivileges={builtinESPrivileges}
          spaces={[]}
          spacesEnabled={false}
          uiCapabilities={uiCapabilities}
        />
      );

      expect(wrapper.find(SimplePrivilegeSection)).toHaveLength(1);
      expectSaveFormButtons(wrapper);
    });

    it('does not care if user cannot manage spaces', () => {
      const role: Role = {
        name: 'my custom role',
        metadata: {},
        elasticsearch: {
          cluster: ['all'],
          indices: [],
          run_as: ['*'],
        },
        kibana: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
        ],
      };

      const features: Feature[] = buildFeatures();
      const mockHttpClient = jest.fn();
      const indexPatterns: string[] = ['foo*', 'bar*'];
      const kibanaPrivileges: RawKibanaPrivileges = buildRawKibanaPrivileges();
      const builtinESPrivileges = buildBuiltinESPrivileges();
      const uiCapabilities: UICapabilities = buildUICapabilities(false);

      const wrapper = mountWithIntl(
        <EditRolePage
          action={'edit'}
          role={role}
          runAsUsers={[]}
          allowDocumentLevelSecurity={true}
          allowFieldLevelSecurity={true}
          features={features}
          httpClient={mockHttpClient}
          indexPatterns={indexPatterns}
          kibanaPrivileges={kibanaPrivileges}
          builtinESPrivileges={builtinESPrivileges}
          spaces={[]}
          spacesEnabled={false}
          uiCapabilities={uiCapabilities}
        />
      );

      expect(wrapper.find('[data-test-subj="reservedRoleBadgeTooltip"]')).toHaveLength(0);

      expect(
        wrapper.find('EuiCallOut[data-test-subj="userCannotManageSpacesCallout"]')
      ).toHaveLength(0);

      expect(wrapper.find(SimplePrivilegeSection)).toHaveLength(1);
      expectSaveFormButtons(wrapper);
    });

    it('renders a partial read-only view when there is a transform error', () => {
      const role: Role = {
        name: 'my custom role',
        metadata: {},
        elasticsearch: {
          cluster: ['all'],
          indices: [],
          run_as: ['*'],
        },
        kibana: [],
        _transform_error: ['kibana'],
      };

      const features: Feature[] = buildFeatures();
      const mockHttpClient = jest.fn();
      const indexPatterns: string[] = ['foo*', 'bar*'];
      const kibanaPrivileges: RawKibanaPrivileges = buildRawKibanaPrivileges();
      const builtinESPrivileges = buildBuiltinESPrivileges();
      const uiCapabilities: UICapabilities = buildUICapabilities(false);

      const wrapper = mountWithIntl(
        <EditRolePage
          action={'edit'}
          role={role}
          runAsUsers={[]}
          allowDocumentLevelSecurity={true}
          allowFieldLevelSecurity={true}
          features={features}
          httpClient={mockHttpClient}
          indexPatterns={indexPatterns}
          kibanaPrivileges={kibanaPrivileges}
          builtinESPrivileges={builtinESPrivileges}
          spaces={[]}
          spacesEnabled={false}
          uiCapabilities={uiCapabilities}
        />
      );

      expect(wrapper.find(TransformErrorSection)).toHaveLength(1);
      expectReadOnlyFormButtons(wrapper);
    });
  });
});
