/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Edge, Node } from '@xyflow/react';
import { i18n } from '@kbn/i18n';
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
  degraded: 60,
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
  // `symptom` is a role older investigations stored; it reads as impacted now.
  if (role === 'symptom' || health === 'degraded') {
    return IMPACT_SEVERITY_SCORES.degraded;
  }
  if (impacted || role === 'contributor') {
    return IMPACT_SEVERITY_SCORES.impacted;
  }
  return undefined;
};

/** What an entity is in the incident: where it started, or what it hurt. */
export type ImpactState = 'root_cause' | 'impacted';

/** The one state a node is badged with. A root cause outranks being impacted. */
export const getImpactState = (annotations?: ImpactMapAnnotations): ImpactState | undefined => {
  if (!annotations) {
    return undefined;
  }
  const { role, health, impacted } = annotations;
  if (role === 'root_cause') {
    return 'root_cause';
  }
  if (
    impacted ||
    role === 'symptom' ||
    role === 'contributor' ||
    health === 'critical' ||
    health === 'degraded'
  ) {
    return 'impacted';
  }
  return undefined;
};

export type ImpactServiceNodeData = ServiceNodeData & {
  impactState?: ImpactState;
  /** Events recorded against the entity, shown as a count on the node. */
  eventCount?: number;
};

const KUBERNETES_TYPE =
  /(^|[^a-z])(k8s|kubernetes|deployment|statefulset|daemonset|replicaset|pod)([^a-z]|$)/i;

/** The EUI icon an entity type names, or the Kubernetes logo when its id or name says it is one. */
export const getEuiIcon = (type?: ImpactMapEntityType): string | undefined =>
  type?.icon?.eui_icon ??
  (type && KUBERNETES_TYPE.test(`${type.id} ${type.label}`) ? 'logoKubernetes' : undefined);
export type ImpactDependencyNodeData = DependencyNodeData & {
  severityScore?: number;
  impactState?: ImpactState;
  euiIcon?: string;
  eventCount?: number;
};

export type ImpactServiceMapNode =
  | Node<ImpactServiceNodeData, 'service'>
  | Node<ImpactDependencyNodeData, 'impactDependency'>
  | Node<ImpactDependencyNodeData, 'impactInfrastructure'>;

export interface ImpactServiceMapEdge extends Edge {
  type: 'default';
  data: { onCriticalPath: boolean; eventCount: number };
}

export interface ImpactMapEdgeColors {
  criticalPath: string;
}

const CRITICAL_PATH_STROKE_WIDTH = 3;

/**
 * Turns an investigation's impact map into service map nodes and edges: an entity type of kind
 * `service` draws as a service circle, `dependency` as a dependency diamond, with the icon the
 * type names, and `infrastructure` as a rounded square. Root cause and impacted entities get the matching severity border, and
 * relationships on the critical path are drawn thicker in the critical path colour. A service
 * APM has traces for takes the icon of its agent, as on the service map.
 */
export const transformImpactMap = (
  {
    entities,
    relationships,
    entity_types: entityTypes,
    relationship_types: relationshipTypes,
    events = [],
  }: InvestigationImpactMapResponse,
  colors: ImpactMapEdgeColors,
  /** Agent names APM knows for services that have traces, by entity id. They win over the map's. */
  agentNames: Record<string, string> = {}
): { nodes: ImpactServiceMapNode[]; edges: ImpactServiceMapEdge[] } => {
  const typesById = new Map<string, ImpactMapEntityType>(entityTypes.map((t) => [t.id, t]));
  const relationshipLabels = new Map(relationshipTypes.map(({ id, label }) => [id, label]));
  const eventCounts = new Map<string, number>();
  events.forEach(({ entity_id: entityId, relationship_id: relationshipId }) => {
    const target = entityId ?? relationshipId;
    if (target) {
      eventCounts.set(target, (eventCounts.get(target) ?? 0) + 1);
    }
  });

  const nodes = entities.map<ImpactServiceMapNode>(
    ({ id, type_id: typeId, label, annotations }) => {
      const type = typesById.get(typeId);
      const score = getImpactSeverityScore(annotations);
      const impactState = getImpactState(annotations);
      const position = { x: 0, y: 0 };

      const euiIcon = getEuiIcon(type);
      const eventCount = eventCounts.get(id) ?? 0;
      const agentName = (agentNames[id] ?? type?.icon?.agent_name) as AgentName | undefined;

      // What runs and hosts the services gets its own shape: a service with no agent logo but a
      // named icon, such as a Kubernetes deployment a type from before this kind existed.
      if (type?.kind === 'infrastructure' || (type?.kind === 'service' && !agentName && euiIcon)) {
        return {
          id,
          type: 'impactInfrastructure',
          position,
          data: {
            id,
            label,
            isService: false,
            severityScore: score,
            impactState,
            euiIcon,
            eventCount,
          },
        };
      }
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
            eventCount,
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
          eventCount,
          agentName,
          ...(score !== undefined && { serviceAnomalyStats: { anomalyScore: score } }),
          ...(annotations?.alert_count && { alertsCount: annotations.alert_count }),
        },
      };
    }
  );

  const edges = relationships.map<ImpactServiceMapEdge>(
    ({ id, type_id: typeId, source_id: source, target_id: target, on_critical_path }) => {
      const onCriticalPath = on_critical_path === true;
      const eventCount = eventCounts.get(id) ?? 0;
      const label = relationshipLabels.get(typeId) ?? typeId;
      return {
        id,
        source,
        target,
        type: 'default',
        label:
          eventCount > 0
            ? i18n.translate('xpack.apm.impactMap.edgeLabelWithEvents', {
                defaultMessage: '{label} · {count, plural, one {# event} other {# events}}',
                values: { label, count: eventCount },
              })
            : label,
        style: onCriticalPath
          ? { stroke: colors.criticalPath, strokeWidth: CRITICAL_PATH_STROKE_WIDTH }
          : DEFAULT_EDGE_STYLE,
        markerEnd: onCriticalPath ? createEdgeMarker(colors.criticalPath) : createEdgeMarker(),
        animated: onCriticalPath,
        zIndex: onCriticalPath ? 1 : 0,
        data: { onCriticalPath, eventCount },
      };
    }
  );

  return { nodes, edges };
};
