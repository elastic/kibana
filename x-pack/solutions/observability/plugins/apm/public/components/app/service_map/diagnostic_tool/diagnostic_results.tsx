/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { ExitSpansAnalysis } from './exit_spans_analysis';
import { ParentRelationshipAnalysis } from './parent_relationship_analysis';
import { TraceCorrelationAnalysis } from './trace_correlation_analysis';
import { DiagnosticInformationalMessage } from './diagnostic_informational_message';
import type { ServiceMapDiagnosticResponse } from '../../../../../common/service_map_diagnostic_types';
export function DiagnosticResults({
  data,
  sourceNode,
  destinationNode,
  traceId,
}: {
  data: ServiceMapDiagnosticResponse;
  sourceNode?: string;
  destinationNode?: string;
  traceId?: string;
}) {
  const apmExitSpans = data?.analysis?.exitSpans?.apmExitSpans || [];
  const totalConnections = data?.analysis?.exitSpans?.totalConnections || 0;
  const hasMatchingDestinationResources =
    data?.analysis?.exitSpans?.hasMatchingDestinationResources || false;
  const destinationHits = data?.elasticsearchResponses?.destinationParentIdsQuery?.hits?.hits || [];
  const hasParent = data?.analysis?.parentRelationships?.found || false;
  const traceCorrelation = data?.analysis?.traceCorrelation || {
    found: false,
    foundInSourceNode: false,
    foundInDestinationNode: false,
    sourceNodeDocumentCount: 0,
    destinationNodeDocumentCount: 0,
  };

  if (!sourceNode || !destinationNode) {
    return null;
  }

  return (
    <>
      <ExitSpansAnalysis
        hasMatchingDestinationResources={hasMatchingDestinationResources}
        totalConnections={totalConnections}
        apmExitSpans={apmExitSpans}
        sourceNode={sourceNode}
        destinationNode={destinationNode}
      />

      <EuiSpacer size="m" />

      <ParentRelationshipAnalysis
        hasParent={hasParent}
        destinationHits={destinationHits}
        sourceNode={sourceNode}
        destinationNode={destinationNode}
      />

      <EuiSpacer size="m" />

      <TraceCorrelationAnalysis
        traceCorrelation={traceCorrelation}
        traceId={traceId}
        sourceNode={sourceNode}
        destinationNode={destinationNode}
      />

      <EuiSpacer size="m" />

      <DiagnosticInformationalMessage />
    </>
  );
}
