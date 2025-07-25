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

interface DiagnosticResultsProps {
  data: {
    analysis: {
      exitSpans: {
        found: boolean;
        totalConnections: number;
        spans: any[];
        otelExitSpans?: any[];
        regularExitSpans?: any[];
        hasMatchingDestinationResources: boolean;
      };
      parentRelationships: {
        found: boolean;
        documentCount: number;
        sourceSpanIds: string[];
      };
      traceCorrelation: {
        found: boolean;
        foundInSourceNode: boolean;
        foundInDestinationNode: boolean;
        sourceNodeDocumentCount: number;
        destinationNodeDocumentCount: number;
      };
    };
    elasticsearchResponses: {
      exitSpansQuery?: any;
      sourceSpanIdsQuery?: any;
      destinationParentIdsQuery?: any;
      traceCorrelationQuery?: any;
    };
  };
  sourceNodeName: string | undefined;
  destinationNodeName: string | undefined;
  traceId: string;
}

export function DiagnosticResults({
  data,
  sourceNodeName,
  destinationNodeName,
  traceId,
}: DiagnosticResultsProps) {
  const exitSpansList = data?.analysis?.exitSpans?.spans || [];
  const otelExitSpans = data?.analysis?.exitSpans?.otelExitSpans || [];
  const regularExitSpans = data?.analysis?.exitSpans?.regularExitSpans || [];
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
  const traceCorrelationResponse = data?.elasticsearchResponses?.traceCorrelationQuery;

  if (!sourceNodeName || !destinationNodeName) {
    return null;
  }

  return (
    <>
      <ExitSpansAnalysis
        hasMatchingDestinationResources={hasMatchingDestinationResources}
        totalConnections={totalConnections}
        exitSpansList={exitSpansList}
        otelExitSpans={otelExitSpans}
        regularExitSpans={regularExitSpans}
        sourceNodeName={sourceNodeName}
        destinationNodeName={destinationNodeName}
      />

      <EuiSpacer size="m" />

      <ParentRelationshipAnalysis
        hasParent={hasParent}
        destinationHits={destinationHits}
        sourceNodeName={sourceNodeName}
        destinationNodeName={destinationNodeName}
      />

      <EuiSpacer size="m" />

      <TraceCorrelationAnalysis
        traceCorrelation={traceCorrelation}
        traceId={traceId}
        sourceNodeName={sourceNodeName}
        destinationNodeName={destinationNodeName}
        traceCorrelationResponse={traceCorrelationResponse}
      />

      <EuiSpacer size="m" />

      <DiagnosticInformationalMessage />
    </>
  );
}
