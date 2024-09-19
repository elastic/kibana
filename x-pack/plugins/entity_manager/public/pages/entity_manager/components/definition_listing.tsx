/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EntityDefinitionWithState } from '@kbn/entities-schema';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { Badges } from '../../../components/badges';
import { useKibana } from '../../../hooks/use_kibana';
import { paths } from '../../../../common/locators/paths';
import { LastSeenStat } from '../../../components/stats/last_seen';
import { EntityCountStat } from '../../../components/stats/entity_count';
import { HistoryCountStat } from '../../../components/stats/history_count';
import { useFetchEntityDefinitions } from '../../../hooks/use_fetch_entity_definitions';

interface ListingProps {
  definition: EntityDefinitionWithState;
}

function Listing({ definition }: ListingProps) {
  const {
    http: { basePath },
  } = useKibana().services;
  const entityDetailUrl = basePath.prepend(paths.entitieDetail(definition.id));

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiText>
                <p>
                  <a href={entityDetailUrl}>{definition.name}</a>
                </p>
              </EuiText>
            </EuiFlexItem>
            <Badges definition={definition} />
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <LastSeenStat definition={definition} titleSize="s" textAlign="right" />
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <EntityCountStat definition={definition} titleSize="s" textAlign="right" />
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <HistoryCountStat definition={definition} titleSize="s" textAlign="right" />
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <EuiStat
            titleSize="s"
            title={`${
              numeral(definition.state.avgCheckpointDuration.history).format('0,0') + 'ms' || 'N/A'
            } | ${
              numeral(definition.state.avgCheckpointDuration.latest).format('0,0') + 'ms' || 'N/A'
            }`}
            textAlign="right"
            description={i18n.translate(
              'xpack.entityManager.listing.historyCheckpointDuration.label',
              {
                defaultMessage: 'Avg. Checkpoint Duration',
              }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <EuiButtonIcon
            data-test-subj="entityManagerListingButton"
            iconType="boxesVertical"
            color="text"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export function DefinitionListing() {
  const { data } = useFetchEntityDefinitions();
  if (!data) return null;
  const defintions = data?.map((definition) => {
    return <Listing definition={definition} key={definition.id} />;
  });

  return <EuiFlexGroup direction="column">{defintions}</EuiFlexGroup>;
}
