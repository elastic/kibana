/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTableRow } from '@elastic/eui';
import type { ReactWrapper } from 'enzyme';

import { findTestSubject } from '@kbn/test-jest-helpers';

import type { Role, RoleKibanaPrivilege } from '../../../../../../../../common/model';
import { FeatureTableCell } from '../../feature_table_cell';
import { PrivilegeSummaryExpandedRow } from '../privilege_summary_expanded_row';

interface DisplayedFeaturePrivileges {
  [featureId: string]: {
    [spaceGroup: string]: {
      primaryFeaturePrivilege: string;
      subFeaturesPrivileges: {
        [subFeatureName: string]: string[];
      };
      hasCustomizedSubFeaturePrivileges: boolean;
    };
  };
}

const getSpaceKey = (entry: RoleKibanaPrivilege) => entry.spaces.join(', ');

export function getDisplayedFeaturePrivileges(
  wrapper: ReactWrapper<any>,
  role: Role
): DisplayedFeaturePrivileges {
  const allExpanderButtons = findTestSubject(wrapper, 'expandPrivilegeSummaryRow');
  allExpanderButtons.forEach((button) => button.simulate('click'));

  // each expanded row renders its own `EuiTableRow`, so there are 2 rows
  // for each feature: one for the primary feature privilege, and one for the sub privilege form
  const rows = wrapper.find(EuiTableRow);

  return rows.reduce((acc, row) => {
    const expandedRow = row.find(PrivilegeSummaryExpandedRow);
    if (expandedRow.length > 0) {
      return {
        ...acc,
        ...getDisplayedSubFeaturePrivileges(acc, expandedRow, role),
      };
    } else {
      const feature = row.find(FeatureTableCell).props().feature;

      const primaryFeaturePrivileges = findTestSubject(row, 'privilegeColumn');

      expect(primaryFeaturePrivileges).toHaveLength(role.kibana.length);

      acc[feature.id] = acc[feature.id] ?? {};

      primaryFeaturePrivileges.forEach((primary, index) => {
        const key = getSpaceKey(role.kibana[index]);

        acc[feature.id][key] = {
          ...acc[feature.id][key],
          primaryFeaturePrivilege: primary.text().replaceAll('Info', '').trim(), // Removing the word "info" to account for the rendered text coming from EuiIcon
          hasCustomizedSubFeaturePrivileges:
            findTestSubject(primary, 'additionalPrivilegesGranted').length > 0,
        };
      });

      return acc;
    }
  }, {} as DisplayedFeaturePrivileges);
}

function getDisplayedSubFeaturePrivileges(
  displayedFeatures: DisplayedFeaturePrivileges,
  expandedRow: ReactWrapper<any>,
  role: Role
) {
  const { feature } = expandedRow.props();

  const subFeatureEntries = findTestSubject(expandedRow as ReactWrapper<any>, 'subFeatureEntry');

  displayedFeatures[feature.id] = displayedFeatures[feature.id] ?? {};

  subFeatureEntries.forEach((subFeatureEntry) => {
    const subFeatureName = findTestSubject(subFeatureEntry, 'subFeatureName').text();

    const entryElements = findTestSubject(subFeatureEntry as ReactWrapper<any>, 'entry', '|=');

    expect(entryElements).toHaveLength(role.kibana.length);

    role.kibana.forEach((entry, index) => {
      const key = getSpaceKey(entry);
      const element = findTestSubject(expandedRow as ReactWrapper<any>, `entry-${index}`);

      const independentPrivileges = element
        .find('EuiFlexGroup[data-test-subj="independentPrivilege"]')
        .reduce((acc2, flexGroup) => {
          const privilegeName = findTestSubject(flexGroup, 'privilegeName').text();
          const isGranted = flexGroup.exists('EuiIconTip[type="check"]');
          if (isGranted) {
            return [...acc2, privilegeName];
          }
          return acc2;
        }, [] as string[]);

      const mutuallyExclusivePrivileges = element
        .find('EuiFlexGroup[data-test-subj="mutexPrivilege"]')
        .reduce((acc2, flexGroup) => {
          const privilegeName = findTestSubject(flexGroup, 'privilegeName').text();
          const isGranted = flexGroup.exists('EuiIconTip[type="check"]');

          if (isGranted) {
            return [...acc2, privilegeName];
          }
          return acc2;
        }, [] as string[]);

      displayedFeatures[feature.id][key] = {
        ...displayedFeatures[feature.id][key],
        subFeaturesPrivileges: {
          ...displayedFeatures[feature.id][key].subFeaturesPrivileges,
          [subFeatureName]: [...independentPrivileges, ...mutuallyExclusivePrivileges],
        },
      };
    });
  });

  return displayedFeatures;
}
