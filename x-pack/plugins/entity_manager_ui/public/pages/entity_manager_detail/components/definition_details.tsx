/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EntityDefinitionWithState } from '@kbn/entities-schema';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { LastSeenStat } from '../../../components/stats/last_seen';
import { EntityCountStat } from '../../../components/stats/entity_count';
import { HistoryCountStat } from '../../../components/stats/history_count';
import { HistoryCheckpointDurationStat } from '../../../components/stats/history_checkpoint_duration';
import { LatestCheckpointDurationStat } from '../../../components/stats/latest_checkpoint_duration';

interface DefinitionDetailsProps {
  definition: EntityDefinitionWithState;
}

export function DefinitionDetails({ definition }: DefinitionDetailsProps) {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <LastSeenStat titleSize="s" definition={definition} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EntityCountStat titleSize="s" definition={definition} />
      </EuiFlexItem>
      <EuiFlexItem>
        <HistoryCountStat titleSize="s" definition={definition} />
      </EuiFlexItem>
      <EuiFlexItem>
        <HistoryCheckpointDurationStat titleSize="s" definition={definition} />
      </EuiFlexItem>
      <EuiFlexItem>
        <LatestCheckpointDurationStat titleSize="s" definition={definition} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
