/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EntityDefinitionWithState } from '@kbn/entities-schema';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { LastSeenStat } from '../../../../components/stats/last_seen';
import { EntityCountStat } from '../../../../components/stats/entity_count';
import { LatestCheckpointDurationStat } from '../../../../components/stats/latest_checkpoint_duration';

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
        <LatestCheckpointDurationStat titleSize="s" definition={definition} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
