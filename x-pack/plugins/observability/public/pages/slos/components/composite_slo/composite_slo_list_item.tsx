/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { CompositeSLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { CompositeSloBadges } from './badges/composite_slo_badges';
import { CompositeSloSummary } from './composite_slo_summary';

export interface CompositeSloListItemProps {
  compositeSlo: CompositeSLOWithSummaryResponse;
  onConfirmDelete: (slo: CompositeSLOWithSummaryResponse) => void;
}

export function CompositeSloListItem({ compositeSlo, onConfirmDelete }: CompositeSloListItemProps) {
  return (
    <EuiPanel data-test-subj="sloItem" hasBorder hasShadow={false}>
      <EuiFlexGroup responsive={false} alignItems="center">
        {/* CONTENT */}
        <EuiFlexItem grow>
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexItem>
                  <EuiText size="s">
                    <span>{compositeSlo.name}</span>
                  </EuiText>
                </EuiFlexItem>
                <CompositeSloBadges isLoading={!compositeSlo.summary} compositeSlo={compositeSlo} />
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              {compositeSlo.summary ? <CompositeSloSummary compositeSlo={compositeSlo} /> : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
