/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiIcon,
  EuiIconTip,
} from '@elastic/eui';
import { Space } from '../../../../../../../../spaces/common/model/space';
import { Role, RoleKibanaPrivilege } from '../../../../../../../common/model';
import { isGlobalPrivilegeDefinition } from '../../../privilege_utils';
import { FeatureTableCell } from '../feature_table_cell';
import { SpaceColumnHeader } from './space_column_header';
import { PrivilegeSummaryExpandedRow } from './privilege_summary_expanded_row';
import { SecuredFeature, KibanaPrivileges } from '../../../../model';
import {
  PrivilegeSummaryCalculator,
  EffectiveFeaturePrivileges,
} from './privilege_summary_calculator';

interface Props {
  role: Role;
  spaces: Space[];
  kibanaPrivileges: KibanaPrivileges;
  canCustomizeSubFeaturePrivileges: boolean;
}

function getColumnKey(entry: RoleKibanaPrivilege) {
  return `privilege_entry_${entry.spaces.join('|')}`;
}

export const PrivilegeSummaryTable = (props: Props) => {
  const [expandedFeatures, setExpandedFeatures] = useState<string[]>([]);

  const calculator = new PrivilegeSummaryCalculator(props.kibanaPrivileges, props.role);

  const toggleExpandedFeature = (featureId: string) => {
    if (expandedFeatures.includes(featureId)) {
      setExpandedFeatures(expandedFeatures.filter((ef) => ef !== featureId));
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
    render: (featureId: string, record: any) => {
      const feature = record.feature as SecuredFeature;
      const hasSubFeaturePrivileges = feature.getSubFeaturePrivileges().length > 0;
      if (!hasSubFeaturePrivileges) {
        return null;
      }
      return (
        <EuiButtonIcon
          onClick={() => toggleExpandedFeature(featureId)}
          data-test-subj={`expandPrivilegeSummaryRow`}
          aria-label={expandedFeatures.includes(featureId) ? 'Collapse' : 'Expand'}
          iconType={expandedFeatures.includes(featureId) ? 'arrowUp' : 'arrowDown'}
        />
      );
    },
  };

  const rawKibanaPrivileges = [...props.role.kibana].sort((entry1, entry2) => {
    if (isGlobalPrivilegeDefinition(entry1)) {
      return -1;
    }
    if (isGlobalPrivilegeDefinition(entry2)) {
      return 1;
    }
    return 0;
  });
  const privilegeColumns = rawKibanaPrivileges.map((entry) => {
    const key = getColumnKey(entry);
    return {
      name: <SpaceColumnHeader entry={entry} spaces={props.spaces} />,
      field: key,
      render: (kibanaPrivilege: EffectiveFeaturePrivileges, record: { featureId: string }) => {
        const { primary, hasCustomizedSubFeaturePrivileges } = kibanaPrivilege[record.featureId];
        let iconTip = null;
        if (hasCustomizedSubFeaturePrivileges) {
          iconTip = (
            <EuiIconTip
              size="s"
              type="iInCircle"
              content={
                <span>
                  <FormattedMessage
                    id="xpack.security.management.editRole.privilegeSummary.additionalPrivilegesGrantedIconTip"
                    defaultMessage="Additional privileges granted. Expand this row for more information."
                  />
                </span>
              }
            />
          );
        } else {
          iconTip = <EuiIcon size="s" type="empty" />;
        }
        return (
          <span
            data-test-subj={`privilegeColumn ${
              hasCustomizedSubFeaturePrivileges ? 'additionalPrivilegesGranted' : ''
            }`}
          >
            {primary?.name ?? 'None'} {iconTip}
          </span>
        );
      },
    };
  });

  const columns: Array<EuiBasicTableColumn<any>> = [];
  if (props.canCustomizeSubFeaturePrivileges) {
    columns.push(rowExpanderColumn);
  }
  columns.push(featureColumn, ...privilegeColumns);

  const privileges = rawKibanaPrivileges.reduce((acc, entry) => {
    return {
      ...acc,
      [getColumnKey(entry)]: calculator.getEffectiveFeaturePrivileges(entry),
    };
  }, {} as Record<string, EffectiveFeaturePrivileges>);

  const items = props.kibanaPrivileges.getSecuredFeatures().map((feature) => {
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
      rowProps={(record) => {
        return {
          'data-test-subj': `summaryTableRow-${record.featureId}`,
        };
      }}
      itemIdToExpandedRowMap={expandedFeatures.reduce((acc, featureId) => {
        return {
          ...acc,
          [featureId]: (
            <PrivilegeSummaryExpandedRow
              feature={props.kibanaPrivileges.getSecuredFeature(featureId)}
              effectiveFeaturePrivileges={Object.values(privileges).map((p) => p[featureId])}
            />
          ),
        };
      }, {})}
    />
  );
};
