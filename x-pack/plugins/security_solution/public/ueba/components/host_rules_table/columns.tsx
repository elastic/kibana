/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  DragEffects,
  DraggableWrapper,
} from '../../../common/components/drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../common/components/drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { IS_OPERATOR } from '../../../timelines/components/timeline/data_providers/data_provider';
import { Provider } from '../../../timelines/components/timeline/data_providers/provider';
import { HostRulesColumns } from './';

import * as i18n from './translations';
import { HostRulesFields } from '../../../../common';

export const getHostRulesColumns = (): HostRulesColumns => [
  {
    field: `node.${HostRulesFields.ruleName}`,
    name: i18n.NAME,
    truncateText: false,
    hideForMobile: false,
    render: (ruleName) => {
      if (ruleName != null && ruleName.length > 0) {
        const id = escapeDataProviderId(`ueba-table-ruleName-${ruleName}`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              excluded: false,
              id,
              name: ruleName,
              kqlQuery: '',
              queryMatch: { field: 'signal.rule.name', value: ruleName, operator: IS_OPERATOR },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                ruleName
              )
            }
          />
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: `node.${HostRulesFields.ruleType}`,
    name: i18n.RULE_TYPE,
    truncateText: false,
    hideForMobile: false,
    render: (ruleType) => {
      if (ruleType != null && ruleType.length > 0) {
        const id = escapeDataProviderId(`ueba-table-ruleType-${ruleType}`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              excluded: false,
              id,
              name: ruleType,
              kqlQuery: '',
              queryMatch: { field: 'signal.rule.type', value: ruleType, operator: IS_OPERATOR },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                ruleType
              )
            }
          />
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: `node.${HostRulesFields.riskScore}`,
    name: i18n.RISK_SCORE,
    truncateText: false,
    hideForMobile: false,
    render: (riskScore) => {
      if (riskScore != null) {
        const id = escapeDataProviderId(`ueba-table-riskScore-${riskScore}`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              excluded: false,
              id,
              name: `${riskScore}`,
              kqlQuery: '',
              queryMatch: {
                field: 'signal.rule.risk_score',
                value: riskScore,
                operator: IS_OPERATOR,
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                riskScore
              )
            }
          />
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: `node.${HostRulesFields.hits}`,
    name: i18n.HITS,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: (hits) => {
      if (hits != null) {
        return hits;
      }
      return getEmptyTagValue();
    },
  },
];
