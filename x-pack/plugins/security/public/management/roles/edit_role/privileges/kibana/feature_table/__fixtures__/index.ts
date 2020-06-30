/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactWrapper } from 'enzyme';

import {
  EuiTableRow,
  EuiCheckbox,
  EuiCheckboxProps,
  EuiButtonGroup,
  EuiButtonGroupProps,
} from '@elastic/eui';

import { findTestSubject } from 'test_utils/find_test_subject';
import { SubFeatureForm } from '../sub_feature_form';

export function getDisplayedFeaturePrivileges(wrapper: ReactWrapper<any>) {
  const allExpanderButtons = findTestSubject(wrapper, 'expandFeaturePrivilegeRow');
  allExpanderButtons.forEach((button) => button.simulate('click'));

  // each expanded row renders its own `EuiTableRow`, so there are 2 rows
  // for each feature: one for the primary feature privilege, and one for the sub privilege form
  const rows = wrapper.find(EuiTableRow);

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
