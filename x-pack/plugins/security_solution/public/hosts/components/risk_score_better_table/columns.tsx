/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import {
  DragEffects,
  DraggableWrapper,
} from '../../../common/components/drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../common/components/drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { HostDetailsLink } from '../../../common/components/links';
import { IS_OPERATOR } from '../../../timelines/components/timeline/data_providers/data_provider';
import { Provider } from '../../../timelines/components/timeline/data_providers/provider';
import { DefaultDraggable } from '../../../common/components/draggables';
import { RiskScoreBetterColumns } from './';

import * as i18n from './translations';
import { HostRiskScore } from '../common/host_risk_score';

export const getRiskScoreBetterColumns = (): RiskScoreBetterColumns => [
  {
    field: 'node.host_name',
    name: i18n.HOST_NAME,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    render: (hostName) => {
      if (hostName != null && hostName.length > 0) {
        const id = escapeDataProviderId(`risk-score-better-table-hostName-${hostName}`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              excluded: false,
              id,
              name: hostName,
              kqlQuery: '',
              queryMatch: { field: 'host.name', value: hostName, operator: IS_OPERATOR },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <HostDetailsLink hostName={hostName} />
              )
            }
          />
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'node.risk_score',
    name: i18n.HOST_RISK_SCORE,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    render: (riskScore) => {
      if (riskScore != null) {
        return (
          <DefaultDraggable
            id={`risk-score-table-draggable-risk-${riskScore}`}
            isDraggable={false}
            field={'risk_stats.risk_score'}
            value={riskScore}
            hideTopN={true}
            tooltipContent={null}
          />
        );
      }
      return getEmptyTagValue();
    },
  },
  {
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
    render: (risk) => {
      if (risk != null) {
        return (
          <DefaultDraggable
            id={`risk-score-table-draggable-risk-${risk}`}
            isDraggable={false}
            field={'risk.keyword'}
            value={risk}
            hideTopN={true}
            tooltipContent={null}
          >
            <HostRiskScore severity={risk} />
          </DefaultDraggable>
        );
      }
      return getEmptyTagValue();
    },
  },
];
