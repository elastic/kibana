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
import { DiagnosticInformationalMessage } from './diagnostic_informational_message';

interface DiagnosticResultsProps {
  data: {
    analysis: {
      exitSpans: {
        found: boolean;
        totalConnections: number;
        spans: any[];
        hasMatchingDestinationResources: boolean;
      };
      parentRelationships: {
        found: boolean;
        documentCount: number;
        sourceSpanIds: string[];
      };
    };
    elasticsearchResponses: {
      exitSpansQuery?: any;
      sourceSpanIdsQuery?: any;
      destinationParentIdsQuery?: any;
    };
  };
  sourceNodeName: string;
  destinationNodeName: string;
}

export function DiagnosticResults({
  data,
  sourceNodeName = 'source node',
  destinationNodeName = 'destination node',
}: DiagnosticResultsProps) {
  const exitSpansList = data?.analysis?.exitSpans?.spans || [];
  const totalConnections = data?.analysis?.exitSpans?.totalConnections || 0;
  const hasMatchingDestinationResources = data?.analysis?.exitSpans?.hasMatchingDestinationResources || false;
  const destinationHits = data?.elasticsearchResponses?.destinationParentIdsQuery?.hits?.hits || [];
  const destinationResponse = data?.elasticsearchResponses?.destinationParentIdsQuery;
  const hasParent = data?.analysis?.parentRelationships?.found || false;

  return (
    <>
      <ExitSpansAnalysis
        hasMatchingDestinationResources={hasMatchingDestinationResources}
        totalConnections={totalConnections}
        exitSpansList={exitSpansList}
        sourceNodeName={sourceNodeName}
        destinationNodeName={destinationNodeName}
      />

      <EuiSpacer size="m" />

      <ParentRelationshipAnalysis
        hasParent={hasParent}
        destinationHits={destinationHits}
        destinationResponse={destinationResponse}
        sourceNodeName={sourceNodeName}
        destinationNodeName={destinationNodeName}
      />

      <EuiSpacer size="m" />

      <DiagnosticInformationalMessage />
    </>
  );
}
