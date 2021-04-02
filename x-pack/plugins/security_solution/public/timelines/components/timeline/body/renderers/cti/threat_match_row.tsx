/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { TimelineNonEcsData } from '../../../../../../../common/search_strategy';
import { DraggableBadge } from '../../../../../../common/components/draggables';

export const ThreatMatchRow = ({ fields }: { fields: TimelineNonEcsData[] }) => (
  <EuiFlexGroup
    alignItems="flexStart"
    data-test-subj="threat-match-row"
    direction="column"
    justifyContent="center"
    gutterSize="none"
  >
    {fields.map((field) => (
      <EuiFlexItem grow={false} key={field.field}>
        <DraggableBadge
          contextId={'hmm'}
          data-test-subj={field.field}
          eventId={'mm'}
          field={field.field}
          value={field.value ? field.value[0] : null}
        />
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
