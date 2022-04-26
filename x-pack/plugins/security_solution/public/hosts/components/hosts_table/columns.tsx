/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import React from 'react';
import {
  DragEffects,
  DraggableWrapper,
} from '../../../common/components/drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../common/components/drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { HostDetailsLink } from '../../../common/components/links';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { IS_OPERATOR } from '../../../timelines/components/timeline/data_providers/data_provider';
import { Provider } from '../../../timelines/components/timeline/data_providers/provider';
import { DefaultDraggable } from '../../../common/components/draggables';
import { HostsTableColumns } from '.';

import * as i18n from './translations';
import { Maybe, RiskSeverity } from '../../../../common/search_strategy';
import { VIEW_HOSTS_BY_SEVERITY } from '../host_risk_score_table/translations';
import { RiskScore } from '../../../common/components/severity/common';

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
          const id = escapeDataProviderId(`hosts-table-hostName-${hostName[0]}`);
          return (
            <DraggableWrapper
              key={id}
              dataProvider={{
                and: [],
                enabled: true,
                excluded: false,
                id,
                name: hostName[0],
                kqlQuery: '',
                queryMatch: { field: 'host.name', value: hostName[0], operator: IS_OPERATOR },
              }}
              render={(dataProvider, _, snapshot) =>
                snapshot.isDragging ? (
                  <DragEffects>
                    <Provider dataProvider={dataProvider} />
                  </DragEffects>
                ) : (
                  <HostDetailsLink hostName={hostName[0]} />
                )
              }
            />
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
            <DefaultDraggable
              id={`host-page-draggable-host.os.name-${hostOsName[0]}`}
              field={'host.os.name'}
              value={hostOsName[0]}
              isDraggable={false}
              hideTopN={true}
              tooltipContent={null}
            />
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
            <DefaultDraggable
              id={`host-page-draggable-host.os.version-${hostOsVersion[0]}`}
              field={'host.os.version'}
              value={hostOsVersion[0]}
              isDraggable={false}
              hideTopN={true}
              tooltipContent={null}
            />
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
