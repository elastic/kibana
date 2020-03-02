/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactWrapper } from 'enzyme';

import { EuiTableRow } from '@elastic/eui';

import { findTestSubject } from 'test_utils/find_test_subject';
import { Role, RoleKibanaPrivilege } from '../../../../../../../../common/model';
import { PrivilegeSummaryExpandedRow } from '../privilege_summary_expanded_row';
import { FeatureTableCell } from '../../feature_table_cell';

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
  allExpanderButtons.forEach(button => button.simulate('click'));

  // each expanded row renders its own `EuiTableRow`, so there are 2 rows
  // for each feature: one for the primary feature privilege, and one for the sub privilege form
  const rows = wrapper.find(EuiTableRow);

  return rows.reduce((acc, row) => {
    const expandedRow = row.find(PrivilegeSummaryExpandedRow);
    if (expandedRow.length > 0) {
      const { feature } = expandedRow.props();

      const subFeatureEntries = findTestSubject(
        expandedRow as ReactWrapper<any>,
        'subFeatureEntry'
      );

      const featureResult = acc[feature.id] || {};
      acc[feature.id] = featureResult;

      subFeatureEntries.forEach(subFeatureEntry => {
        const subFeatureName = findTestSubject(subFeatureEntry, 'subFeatureName').text();

        const entryElements = findTestSubject(expandedRow as ReactWrapper<any>, 'entry', '|=');

        expect(entryElements).toHaveLength(role.kibana.length);

        entryElements.forEach((entry, index) => {
          const key = getSpaceKey(role.kibana[index]);

          const independentPrivileges = entry
            .find('EuiFlexGroup[data-test-subj="independentPrivilege"]')
            .reduce((acc2, flexGroup) => {
              const privilegeName = findTestSubject(flexGroup, 'privilegeName').text();
              const isGranted = flexGroup.exists('EuiIconTip[type="check"]');
              if (isGranted) {
                return [...acc2, privilegeName];
              }
              return acc2;
            }, [] as string[]);

          const mutuallyExclusivePrivileges = entry
            .find('EuiFlexGroup[data-test-subj="mutexPrivilege"]')
            .reduce((acc2, flexGroup) => {
              const privilegeName = findTestSubject(flexGroup, 'privilegeName').text();
              const isGranted = flexGroup.exists('EuiIconTip[type="check"]');

              if (isGranted) {
                return [...acc2, privilegeName];
              }
              return acc2;
            }, [] as string[]);

          featureResult[key] = {
            ...featureResult[key],
            subFeaturesPrivileges: {
              ...featureResult[key].subFeaturesPrivileges,
              [subFeatureName]: [...independentPrivileges, ...mutuallyExclusivePrivileges],
            },
          };
        });
      });

      return acc;
    } else {
      const feature = row.find(FeatureTableCell).props().feature;

      const primaryFeaturePrivileges = findTestSubject(row, 'privilegeColumn');

      expect(primaryFeaturePrivileges).toHaveLength(role.kibana.length);

      const featureResult = acc[feature.id] || {};

      primaryFeaturePrivileges.forEach((primary, index) => {
        const key = getSpaceKey(role.kibana[index]);

        featureResult[key] = {
          ...featureResult[key],
          primaryFeaturePrivilege: primary.text().trim(),
          hasCustomizedSubFeaturePrivileges:
            findTestSubject(primary, 'additionalPrivilegesGranted').length > 0,
        };
      });

      acc[feature.id] = featureResult;

      return acc;
    }
  }, {} as DisplayedFeaturePrivileges);
}
