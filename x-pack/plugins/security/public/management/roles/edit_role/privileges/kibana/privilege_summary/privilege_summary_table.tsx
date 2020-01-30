/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiInMemoryTable, EuiBasicTableColumn, EuiButtonIcon, EuiIconTip } from '@elastic/eui';
import { Space } from '../../../../../../../../spaces/common/model/space';
import {
  Role,
  KibanaPrivileges,
  RoleKibanaPrivilege,
  SecuredFeature,
} from '../../../../../../../common/model';
import { isGlobalPrivilegeDefinition } from '../../../privilege_utils';
import { PrivilegeSummaryCalculator } from '../privilege_calculator';
import { FeatureTableCell } from '../feature_table_cell';
import { SpaceColumnHeader } from './space_column_header';
import { PrivilegeSummaryExpandedRow } from './privilege_summary_expanded_row';

interface Props {
  role: Role;
  spaces: Space[];
  features: SecuredFeature[];
  kibanaPrivileges: KibanaPrivileges;
}

const SPACES_DISPLAY_COUNT = 4;

function getColumnKey(entry: RoleKibanaPrivilege) {
  return `privilege_entry_${entry.spaces.join('|')}`;
}

export const PrivilegeSummaryTable = (props: Props) => {
  const [expandedFeatures, setExpandedFeatures] = useState<string[]>([]);

  const calculator = new PrivilegeSummaryCalculator(props.kibanaPrivileges, props.role);

  const toggleExpandedFeature = (featureId: string) => {
    if (expandedFeatures.includes(featureId)) {
      setExpandedFeatures(expandedFeatures.filter(ef => ef !== featureId));
    } else {
      setExpandedFeatures([...expandedFeatures, featureId]);
    }
  };

  const featureColumn: EuiBasicTableColumn<any> = {
    name: 'Feature',
    field: 'feature',
    render: (feature: any) => {
      return <FeatureTableCell feature={feature} />;
    },
  };
  const rowExpanderColumn: EuiBasicTableColumn<any> = {
    align: 'right',
    width: '40px',
    isExpander: true,
    field: 'featureId',
    name: '',
    render: (featureId: string) => (
      <EuiButtonIcon
        onClick={() => toggleExpandedFeature(featureId)}
        data-test-subj={`expandPrivilegeSummaryRow`}
        aria-label={expandedFeatures.includes(featureId) ? 'Collapse' : 'Expand'}
        iconType={expandedFeatures.includes(featureId) ? 'arrowUp' : 'arrowDown'}
      />
    ),
  };

  const rawKibanaPrivileges = [...props.role.kibana].sort(entry =>
    isGlobalPrivilegeDefinition(entry) ? -1 : 1
  );
  const privilegeColumns = rawKibanaPrivileges.map(entry => {
    const key = getColumnKey(entry);
    return {
      name: <SpaceColumnHeader entry={entry} spaces={props.spaces} />,
      field: key,
      render: (
        kibanaPrivilege: ReturnType<PrivilegeSummaryCalculator['getEffectiveFeaturePrivileges']>,
        record: { featureId: string }
      ) => {
        const { primary, hasNonSupersededSubFeaturePrivileges } = kibanaPrivilege[record.featureId];
        let iconTip = null;
        if (hasNonSupersededSubFeaturePrivileges) {
          iconTip = (
            <EuiIconTip
              size="s"
              type="alert"
              color="warning"
              content={
                <span>Additional privileges granted. Expand this row for more information.</span>
              }
            />
          );
        }
        return (
          <span>
            {iconTip} {primary?.name ?? 'NO SOUP!'}
          </span>
        );
      },
    };
  });

  const columns: Array<EuiBasicTableColumn<any>> = [
    featureColumn,
    ...privilegeColumns,
    rowExpanderColumn,
  ];

  const privileges = rawKibanaPrivileges.reduce((acc, entry) => {
    return {
      ...acc,
      [getColumnKey(entry)]: calculator.getEffectiveFeaturePrivileges(entry),
    };
  }, {} as Record<string, ReturnType<PrivilegeSummaryCalculator['getEffectiveFeaturePrivileges']>>);

  const items = props.features.map(feature => {
    return {
      feature,
      featureId: feature.id,
      ...privileges,
    };
  });

  return (
    <EuiInMemoryTable
      columns={columns}
      items={items}
      itemId="featureId"
      itemIdToExpandedRowMap={expandedFeatures.reduce((acc, featureId) => {
        return {
          ...acc,
          [featureId]: (
            <PrivilegeSummaryExpandedRow
              feature={props.features.find(f => f.id === featureId)!}
              effectiveSubFeaturePrivileges={Object.values(privileges).map(
                p => p[featureId].subFeature
              )}
            />
          ),
        };
      }, {})}
    />
  );
};
