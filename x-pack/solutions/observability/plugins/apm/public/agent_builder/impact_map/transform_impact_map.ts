/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Edge, Node } from '@xyflow/react';
import type { AgentName } from '@kbn/apm-types';
import type {
  ImpactMapAnnotations,
  ImpactMapEntityType,
  InvestigationImpactMapResponse,
} from '@kbn/agentic-investigations-plugin/common';
import type { DependencyNodeData, ServiceNodeData } from '../../../common/service_map';
import { DEFAULT_EDGE_STYLE } from '../../../common/service_map/constants';
import { createEdgeMarker } from '../../../common/service_map/utils';

/**
 * Anomaly scores that put an annotation in an ML severity band, so impact map nodes get the
 * service map's own health colours: critical, major and minor.
 */
export const IMPACT_SEVERITY_SCORES = {
  rootCause: 95,
  symptom: 60,
  impacted: 30,
} as const;

/** The score whose severity colour a node's border takes, or none for a healthy or plain node. */
export const getImpactSeverityScore = (annotations?: ImpactMapAnnotations): number | undefined => {
  if (!annotations) {
    return undefined;
  }
  const { role, health, impacted } = annotations;
  if (role === 'root_cause' || health === 'critical') {
    return IMPACT_SEVERITY_SCORES.rootCause;
  }
  if (role === 'symptom' || health === 'degraded') {
    return IMPACT_SEVERITY_SCORES.symptom;
  }
  if (impacted || role === 'contributor') {
    return IMPACT_SEVERITY_SCORES.impacted;
  }
  return undefined;
};

/** What an entity is in the incident: where it started, where it shows, or what it hurt. */
export type ImpactState = 'root_cause' | 'symptom' | 'impacted';

/** The one state a node is badged with. A root cause or symptom outranks being impacted. */
export const getImpactState = (annotations?: ImpactMapAnnotations): ImpactState | undefined => {
  if (!annotations) {
    return undefined;
  }
  const { role, health, impacted } = annotations;
  if (role === 'root_cause') {
    return 'root_cause';
  }
  if (role === 'symptom') {
    return 'symptom';
  }
  if (impacted || role === 'contributor' || health === 'critical' || health === 'degraded') {
    return 'impacted';
  }
  return undefined;
};

export type ImpactServiceNodeData = ServiceNodeData & { impactState?: ImpactState };
export type ImpactDependencyNodeData = DependencyNodeData & {
  severityScore?: number;
  impactState?: ImpactState;
};

export type ImpactServiceMapNode =
  | Node<ImpactServiceNodeData, 'service'>
  | Node<ImpactDependencyNodeData, 'impactDependency'>;

export interface ImpactServiceMapEdge extends Edge {
  type: 'default';
  data: { onCriticalPath: boolean };
}

export interface ImpactMapEdgeColors {
  criticalPath: string;
}

const CRITICAL_PATH_STROKE_WIDTH = 3;

/**
 * Turns an investigation's impact map into service map nodes and edges: an entity type of kind
 * `service` draws as a service circle, `dependency` as a dependency diamond, with the icon the
 * type names. Root cause, symptom and impacted entities get the matching severity border, and
 * relationships on the critical path are drawn thicker in the critical path colour. A service
 * APM has traces for takes the icon of its agent, as on the service map.
 */
export const transformImpactMap = (
  {
    entities,
    relationships,
    entity_types: entityTypes,
    relationship_types: relationshipTypes,
  }: InvestigationImpactMapResponse,
  colors: ImpactMapEdgeColors,
  /** Agent names APM knows for services that have traces, by entity id. They win over the map's. */
  agentNames: Record<string, string> = {}
): { nodes: ImpactServiceMapNode[]; edges: ImpactServiceMapEdge[] } => {
  const typesById = new Map<string, ImpactMapEntityType>(entityTypes.map((t) => [t.id, t]));
  const relationshipLabels = new Map(relationshipTypes.map(({ id, label }) => [id, label]));

  const nodes = entities.map<ImpactServiceMapNode>(
    ({ id, type_id: typeId, label, annotations }) => {
      const type = typesById.get(typeId);
      const score = getImpactSeverityScore(annotations);
      const impactState = getImpactState(annotations);
      const position = { x: 0, y: 0 };

      if (type?.kind === 'dependency') {
        return {
          id,
          type: 'impactDependency',
          position,
          data: {
            id,
            label,
            isService: false,
            spanType: type.icon?.span_type,
            spanSubtype: type.icon?.span_subtype,
            severityScore: score,
            impactState,
          },
        };
      }
      return {
        id,
        type: 'service',
        position,
        data: {
          id,
          label,
          isService: true,
          impactState,
          agentName: (agentNames[id] ?? type?.icon?.agent_name) as AgentName | undefined,
          ...(score !== undefined && { serviceAnomalyStats: { anomalyScore: score } }),
          ...(annotations?.alert_count && { alertsCount: annotations.alert_count }),
        },
      };
    }
  );

  const edges = relationships.map<ImpactServiceMapEdge>(
    ({ id, type_id: typeId, source_id: source, target_id: target, on_critical_path }) => {
      const onCriticalPath = on_critical_path === true;
      return {
        id,
        source,
        target,
        type: 'default',
        label: relationshipLabels.get(typeId) ?? typeId,
        style: onCriticalPath
          ? { stroke: colors.criticalPath, strokeWidth: CRITICAL_PATH_STROKE_WIDTH }
          : DEFAULT_EDGE_STYLE,
        markerEnd: onCriticalPath ? createEdgeMarker(colors.criticalPath) : createEdgeMarker(),
        animated: onCriticalPath,
        zIndex: onCriticalPath ? 1 : 0,
        data: { onCriticalPath },
      };
    }
  );

  return { nodes, edges };
};
