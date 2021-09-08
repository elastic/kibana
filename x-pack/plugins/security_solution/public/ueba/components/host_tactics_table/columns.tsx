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
import { HostTacticsColumns } from './';

import * as i18n from './translations';
import { HostTacticsFields } from '../../../../common';

export const getHostTacticsColumns = (): HostTacticsColumns => [
  {
    field: `node.${HostTacticsFields.tactic}`,
    name: i18n.TACTIC,
    truncateText: false,
    hideForMobile: false,
    render: (tactic) => {
      if (tactic != null && tactic.length > 0) {
        const id = escapeDataProviderId(`ueba-table-tactic-${tactic}`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              excluded: false,
              id,
              name: tactic,
              kqlQuery: '',
              queryMatch: {
                field: 'signal.rule.threat.tactic.name',
                value: tactic,
                operator: IS_OPERATOR,
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                tactic
              )
            }
          />
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: `node.${HostTacticsFields.technique}`,
    name: i18n.TECHNIQUE,
    truncateText: false,
    hideForMobile: false,
    render: (technique) => {
      if (technique != null && technique.length > 0) {
        const id = escapeDataProviderId(`ueba-table-technique-${technique}`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              excluded: false,
              id,
              name: technique,
              kqlQuery: '',
              queryMatch: {
                field: 'signal.rule.threat.technique.name',
                value: technique,
                operator: IS_OPERATOR,
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                technique
              )
            }
          />
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: `node.${HostTacticsFields.riskScore}`,
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
    field: `node.${HostTacticsFields.hits}`,
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
