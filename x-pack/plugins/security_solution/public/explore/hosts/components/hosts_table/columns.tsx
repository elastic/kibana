/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { CellActions, CellActionsMode } from '@kbn/cell-actions';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { HostDetailsLink } from '../../../../common/components/links';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import type { HostsTableColumns } from '.';
import * as i18n from './translations';
import type { Maybe, RiskSeverity } from '../../../../../common/search_strategy';
import { VIEW_HOSTS_BY_SEVERITY } from '../host_risk_score_table/translations';
import { RiskScore } from '../../../components/risk_score/severity/common';
import { CELL_ACTIONS_DEFAULT_TRIGGER } from '../../../../../common/constants';

export const getHostsColumns = (
  showRiskColumn: boolean,
  dispatchSeverityUpdate: (s: RiskSeverity) => void
): HostsTableColumns => {
  const columns: HostsTableColumns = [
    {
      field: 'node.host.name',
      name: i18n.NAME,
      truncateText: false,
      mobileOptions: { show: true },
      sortable: true,
      render: (hostName) => {
        if (hostName != null && hostName.length > 0) {
          return (
            <CellActions
              mode={CellActionsMode.HOVER}
              visibleCellActions={5}
              showActionTooltips
              triggerId={CELL_ACTIONS_DEFAULT_TRIGGER}
              field={{
                name: 'host.name',
                value: hostName[0],
                type: 'keyword',
              }}
            >
              <HostDetailsLink hostName={hostName[0]} />
            </CellActions>
          );
        }
        return getEmptyTagValue();
      },
      width: '35%',
    },
    {
      field: 'node.lastSeen',
      name: (
        <EuiToolTip content={i18n.FIRST_LAST_SEEN_TOOLTIP}>
          <>
            {i18n.LAST_SEEN} <EuiIcon color="subdued" type="iInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      truncateText: false,
      mobileOptions: { show: true },
      sortable: true,
      render: (lastSeen: Maybe<string | string[]> | undefined) => {
        if (lastSeen != null && lastSeen.length > 0) {
          return (
            <FormattedRelativePreferenceDate
              value={Array.isArray(lastSeen) ? lastSeen[0] : lastSeen}
            />
          );
        }
        return getEmptyTagValue();
      },
    },
    {
      field: 'node.host.os.name',
      name: (
        <EuiToolTip content={i18n.OS_LAST_SEEN_TOOLTIP}>
          <>
            {i18n.OS} <EuiIcon color="subdued" type="iInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      truncateText: false,
      mobileOptions: { show: true },
      sortable: false,
      render: (hostOsName) => {
        if (hostOsName != null) {
          return (
            <CellActions
              mode={CellActionsMode.HOVER}
              visibleCellActions={5}
              showActionTooltips
              triggerId={CELL_ACTIONS_DEFAULT_TRIGGER}
              field={{
                name: 'host.os.name',
                value: hostOsName[0],
                type: 'keyword',
              }}
            >
              {hostOsName}
            </CellActions>
          );
        }
        return getEmptyTagValue();
      },
    },
    {
      field: 'node.host.os.version',
      name: i18n.VERSION,
      truncateText: false,
      mobileOptions: { show: true },
      sortable: false,
      render: (hostOsVersion) => {
        if (hostOsVersion != null) {
          return (
            <CellActions
              mode={CellActionsMode.HOVER}
              visibleCellActions={5}
              showActionTooltips
              triggerId={CELL_ACTIONS_DEFAULT_TRIGGER}
              field={{
                name: 'host.os.version',
                value: hostOsVersion[0],
                type: 'keyword',
              }}
            >
              {hostOsVersion}
            </CellActions>
          );
        }
        return getEmptyTagValue();
      },
    },
  ];

  if (showRiskColumn) {
    columns.push({
      field: 'node.risk',
      name: (
        <EuiToolTip content={i18n.HOST_RISK_TOOLTIP}>
          <>
            {i18n.HOST_RISK} <EuiIcon color="subdued" type="iInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      truncateText: false,
      mobileOptions: { show: true },
      sortable: false,
      render: (riskScore: RiskSeverity) => {
        if (riskScore != null) {
          return (
            <RiskScore
              toolTipContent={
                <EuiLink onClick={() => dispatchSeverityUpdate(riskScore)}>
                  <EuiText size="xs">{VIEW_HOSTS_BY_SEVERITY(riskScore.toLowerCase())}</EuiText>
                </EuiLink>
              }
              severity={riskScore}
            />
          );
        }
        return getEmptyTagValue();
      },
    });
  }

  return columns;
};
