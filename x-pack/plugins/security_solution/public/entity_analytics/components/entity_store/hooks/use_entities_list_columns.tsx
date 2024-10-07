/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EuiButtonIcon, EuiIcon, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { UserPanelKey } from '../../../../flyout/entity_details/user_right';
import { HostPanelKey } from '../../../../flyout/entity_details/host_right';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { RiskScoreLevel } from '../../severity/common';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import type { Columns } from '../../../../explore/components/paginated_table';
import type { Entity } from '../../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import type { CriticalityLevels } from '../../../../../common/constants';
import { ENTITIES_LIST_TABLE_ID } from '../constants';
import { isUserEntity } from '../helpers';

export type EntitiesListColumns = [
  Columns<Entity>,
  Columns<string, Entity>,
  Columns<string | undefined, Entity>,
  Columns<CriticalityLevels, Entity>,
  Columns<Entity>,
  Columns<Entity>,
  Columns<string, Entity>
];

export const useEntitiesListColumns = (): EntitiesListColumns => {
  const { openRightPanel } = useExpandableFlyoutApi();
  const { euiTheme } = useEuiTheme();

  return [
    {
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.entitiesList.actionsColumn.title"
          defaultMessage="Actions"
        />
      ),

      render: (record: Entity) => {
        const field = record.entity?.identityFields[0];
        const value = record.entity?.displayName;
        const onClick = () => {
          const id = isUserEntity(record) ? UserPanelKey : HostPanelKey;
          const params = {
            [isUserEntity(record) ? 'userName' : 'hostName']: value,
            contextID: ENTITIES_LIST_TABLE_ID,
            scopeId: ENTITIES_LIST_TABLE_ID,
          };

          openRightPanel({ id, params });
        };

        if (!field || !value) {
          return null;
        }

        return (
          <EuiButtonIcon
            iconType="expand"
            onClick={onClick}
            aria-label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.entityStore.entitiesList.entityPreview.ariaLabel',
              {
                defaultMessage: 'Preview entity with name {name}',
                values: { name: value },
              }
            )}
          />
        );
      },
      width: '5%',
    },
    {
      field: 'entity.displayName.keyword',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.entitiesList.nameColumn.title"
          defaultMessage="Name"
        />
      ),
      sortable: true,
      render: (_: string, record: Entity) => {
        return (
          <span>
            {isUserEntity(record) ? <EuiIcon type="user" /> : <EuiIcon type="storage" />}
            <span css={{ paddingLeft: euiTheme.size.s }}>{record.entity?.displayName}</span>
          </span>
        );
      },
      width: '30%',
    },
    {
      field: 'entity.source',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.entitiesList.sourceColumn.title"
          defaultMessage="Source"
        />
      ),
      width: '10%',
      render: (source: string | undefined) => {
        if (source != null) {
          return <span>{source}</span>;
        }

        return getEmptyTagValue();
      },
    },
    {
      field: 'asset.criticality',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.entitiesList.criticalityColumn.title"
          defaultMessage="Criticality"
        />
      ),
      width: '10%',
      render: (criticality: CriticalityLevels) => {
        if (criticality != null) {
          return criticality;
        }

        return getEmptyTagValue();
      },
    },
    {
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.entitiesList.riskScoreColumn.title"
          defaultMessage="Risk score"
        />
      ),
      width: '10%',
      render: (entity: Entity) => {
        const riskScore = isUserEntity(entity)
          ? entity.user?.risk?.calculated_score_norm
          : entity.host?.risk?.calculated_score_norm;

        if (riskScore != null) {
          return (
            <span data-test-subj="risk-score-truncate" title={`${riskScore}`}>
              {Math.round(riskScore)}
            </span>
          );
        }
        return getEmptyTagValue();
      },
    },
    {
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.entitiesList.riskLevelColumn.title"
          defaultMessage="Risk Level"
        />
      ),
      width: '10%',
      render: (entity: Entity) => {
        const riskLevel = isUserEntity(entity)
          ? entity.user?.risk?.calculated_level
          : entity.host?.risk?.calculated_level;

        if (riskLevel != null) {
          return <RiskScoreLevel severity={riskLevel} />;
        }
        return getEmptyTagValue();
      },
    },
    {
      field: 'entity.lastSeenTimestamp',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.entitiesList.lastUpdateColumn.title"
          defaultMessage="Last Update"
        />
      ),
      sortable: true,
      render: (lastUpdate: string) => {
        return <FormattedRelativePreferenceDate value={lastUpdate} />;
      },
      width: '25%',
    },
  ];
};
