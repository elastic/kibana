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
import {
  DEFAULT_SERVICE_ICON,
  resolveEntityIcon,
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
  // Red like the root cause: what the problem hurt is as serious as where it started.
  impacted: 95,
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
  // `symptom` is a role older investigations stored; it reads as impacted now. Degraded is
  // impacted too: a node is either red or plain, never a third colour.
  if (impacted || role === 'symptom' || role === 'contributor' || health === 'degraded') {
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

/** Hover tip: the entity's kind (type) and catalog / span detail (sub-type). */
export type EntityTypeTooltip = {
  typeKindLabel: string;
  subtypeLabel: string;
};

/**
 * Labels for the entity hover tip. Prefer APM span type / subtype when the catalog has them;
 * otherwise kind is the type and the catalog label (or agent) is the sub-type.
 */
export const getEntityTypeTooltip = (
  type: ImpactMapEntityType | undefined,
  typeId: string,
  agentName?: string
): EntityTypeTooltip => {
  if (type?.icon?.span_type) {
    return {
      typeKindLabel: type.icon.span_type,
      subtypeLabel: type.icon.span_subtype ?? type.label ?? typeId,
    };
  }
  const typeKindLabel =
    type?.kind === 'service'
      ? i18n.translate('xpack.apm.impactMap.entityType.service', {
          defaultMessage: 'Service',
        })
      : i18n.translate('xpack.apm.impactMap.entityType.infrastructure', {
          defaultMessage: 'Infrastructure',
        });
  const subtypeLabel =
    (type?.kind === 'service' && agentName) || type?.label || typeId;
  return { typeKindLabel, subtypeLabel };
};

export type ImpactServiceNodeData = ServiceNodeData & {
  /** The entity this one sits inside, when the map groups it. */
  parentId?: string;
  impactState?: ImpactState;
  /** Events recorded against the entity, shown as a count on the node. */
  eventCount?: number;
  /** Fallback glyph when there is no APM agent logo — every service circle still shows something. */
  euiIcon?: string;
  typeKindLabel?: string;
  subtypeLabel?: string;
};

const KUBERNETES_TYPE =
  /(^|[^a-z])(k8s|kubernetes|deployment|statefulset|daemonset|replicaset|pod)([^a-z]|$)/i;

/**
 * Long opaque ids become a short handle so the map stays readable. The full id is still the
 * node id (and what the flyout opens on).
 */
export const shortenEntityLabel = (label: string): string => {
  const trimmed = label.trim();
  if (/^[0-9a-f]{20,}$/i.test(trimmed)) {
    return `${trimmed.slice(0, 8)}…${trimmed.slice(-6)}`;
  }
  return label;
};

/**
 * The icon drawn for an entity: named on the type, else guessed from the type and label, else a
 * kind default. Always set — empty nodes are never drawn.
 */
export const getEuiIcon = (type?: ImpactMapEntityType, entityLabel?: string): string =>
  resolveEntityIcon(type, entityLabel);

/**
 * Application code draws as a circle (APM agent logo, or the generic service icon). Everything else
 * — including a stored "service" that is really a Kubernetes object or has a named technology icon
 * — draws as a rounded square.
 */
export const drawsAsServiceCircle = (
  type: ImpactMapEntityType | undefined,
  agentName: string | undefined
): boolean => {
  if (agentName) {
    return true;
  }
  if (!type || type.kind !== 'service') {
    return false;
  }
  if (type.icon?.eui_icon || KUBERNETES_TYPE.test(`${type.id} ${type.label}`)) {
    return false;
  }
  return true;
};

export type ImpactDependencyNodeData = DependencyNodeData & {
  parentId?: string;
  severityScore?: number;
  impactState?: ImpactState;
  euiIcon?: string;
  eventCount?: number;
  typeKindLabel?: string;
  subtypeLabel?: string;
};

/** An entity that other entities sit inside: drawn as a labelled box around its members. */
export interface ImpactGroupNodeData extends Record<string, unknown> {
  id: string;
  label: string;
  parentId?: string;
  severityScore?: number;
  impactState?: ImpactState;
  euiIcon?: string;
  eventCount?: number;
  typeKindLabel?: string;
  subtypeLabel?: string;
}

export type ImpactServiceMapNode =
  | Node<ImpactServiceNodeData, 'service'>
  | Node<ImpactDependencyNodeData, 'impactInfrastructure'>
  | Node<ImpactGroupNodeData, 'impactGroup'>;

export interface ImpactServiceMapEdge extends Edge {
  type: 'impact';
  data: { onCriticalPath: boolean; eventCount: number; inferred?: boolean; hover?: string };
}

export interface ImpactMapEdgeColors {
  criticalPath: string;
}

const CRITICAL_PATH_STROKE_WIDTH = 3;
/**
 * Provenance links (who owns, manages or deploys something). They fan out across the map and
 * bury the path the investigation cares about — keep them off the canvas.
 */
const HIDDEN_RELATIONSHIP_TYPES = new Set(['owned_by', 'managed_by', 'deployed_by']);
/** Soften every link that is not on the critical path so the path is what the eye follows. */
const CONTEXT_EDGE_STYLE = {
  ...DEFAULT_EDGE_STYLE,
  strokeWidth: 1.5,
  opacity: 0.35,
} as const;

/**
 * Turns an investigation's impact map into service map nodes and edges: an entity type of kind
 * `service` draws as a service circle, and anything else (`infrastructure`, or a stored
 * `dependency`) as a rounded square with the icon the type names. Root cause and impacted entities get the matching severity border, and
 * relationships on the critical path are drawn thicker in the critical path colour. A service
 * APM has traces for takes the icon of its agent, as on the service map.
 *
 * Ownership and management links are left off the canvas (they fan out and cross the path). Edge
 * labels only appear on the critical path, and guesses are dashed without a label unless they are
 * on that path. Group boxes stay quiet unless they are the root cause — their members already
 * carry the red.
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

  // Ownership links are not drawn, so a team that only appears as an owner would sit alone —
  // drop those too.
  const drawnRelationships = relationships.filter(
    ({ type_id: typeId }) => !HIDDEN_RELATIONSHIP_TYPES.has(typeId)
  );
  const linkedIds = new Set(
    drawnRelationships.flatMap(({ source_id: source, target_id: target }) => [source, target])
  );

  // A parent that is not in the map draws nothing, and an entity is never its own parent.
  const entityIds = new Set(entities.map(({ id }) => id));
  const parentOf = new Map(
    entities.flatMap(({ id, parent_id: parentId }) =>
      parentId && parentId !== id && entityIds.has(parentId) ? [[id, parentId] as const] : []
    )
  );
  const groupIds = new Set(parentOf.values());

  // Keep groups that still have a drawn member, and every entity that is linked or holds others.
  const keptEntityIds = new Set<string>();
  entities.forEach(({ id, type_id: typeId }) => {
    if (groupIds.has(id)) return;
    const type = typesById.get(typeId);
    const isOrphanOwner = type?.id === 'team' || typeId === 'team';
    if (linkedIds.has(id) || !isOrphanOwner) {
      keptEntityIds.add(id);
      for (let up = parentOf.get(id); up; up = parentOf.get(up)) {
        keptEntityIds.add(up);
      }
    }
  });
  // A group with no remaining members is dropped.
  groupIds.forEach((id) => {
    const hasMember = entities.some(
      ({ id: child }) => parentOf.get(child) === id && keptEntityIds.has(child)
    );
    if (hasMember) keptEntityIds.add(id);
  });

  const nodes = entities
    .filter(({ id }) => keptEntityIds.has(id))
    .map<ImpactServiceMapNode>(({ id, type_id: typeId, label, annotations }) => {
      const type = typesById.get(typeId);
      const parentId = parentOf.get(id);
      const score = getImpactSeverityScore(annotations);
      const impactState = getImpactState(annotations);
      const position = { x: 0, y: 0 };

      const eventCount = eventCounts.get(id) ?? 0;
      const agentName = (agentNames[id] ?? type?.icon?.agent_name) as AgentName | undefined;
      const euiIcon = getEuiIcon(type, label);
      const displayLabel = shortenEntityLabel(label);
      const { typeKindLabel, subtypeLabel } = getEntityTypeTooltip(type, typeId, agentName);

      if (groupIds.has(id)) {
        // Members already show impact; a box only goes red when it is the root cause itself.
        const groupIsRoot = annotations?.role === 'root_cause';
        return {
          id,
          type: 'impactGroup',
          position,
          data: {
            id,
            label: displayLabel,
            parentId,
            severityScore: groupIsRoot ? score : undefined,
            impactState: groupIsRoot ? 'root_cause' : undefined,
            euiIcon: euiIcon === DEFAULT_SERVICE_ICON ? 'nested' : euiIcon,
            eventCount,
            typeKindLabel,
            subtypeLabel,
          },
        };
      }

      // Only a service is a circle. Everything else (databases, queues, Kubernetes objects, hosts,
      // cloud resources) is a rounded square with its icon, as is a service with no agent logo but
      // a named icon, such as a Kubernetes deployment a type from before this kind existed.
      if (!drawsAsServiceCircle(type, agentName)) {
        return {
          id,
          type: 'impactInfrastructure',
          position,
          data: {
            id,
            label: displayLabel,
            parentId,
            isService: false,
            severityScore: score,
            impactState,
            euiIcon,
            eventCount,
            typeKindLabel,
            subtypeLabel,
          },
        };
      }
      return {
        id,
        type: 'service',
        position,
        data: {
          id,
          label: displayLabel,
          parentId,
          isService: true,
          impactState,
          eventCount,
          agentName,
          // When APM has no agent logo, the circle still shows a service (or guessed) glyph.
          euiIcon: agentName ? undefined : euiIcon,
          typeKindLabel,
          subtypeLabel,
          ...(score !== undefined && { serviceAnomalyStats: { anomalyScore: score } }),
          ...(annotations?.alert_count && { alertsCount: annotations.alert_count }),
        },
      };
    });

  const entityTypeId = new Map(entities.map(({ id, type_id: typeId }) => [id, typeId]));
  const isRepository = (entityId: string): boolean => {
    const typeId = entityTypeId.get(entityId);
    return typeId === 'repository' || typesById.get(typeId ?? '')?.id === 'repository';
  };

  const edges = drawnRelationships
    .filter(({ source_id: source, target_id: target, on_critical_path }) => {
      if (!keptEntityIds.has(source) || !keptEntityIds.has(target)) return false;
      // Repos stay on the map as context; drawing every code link to them crosses the path.
      if (on_critical_path !== true && (isRepository(source) || isRepository(target))) {
        return false;
      }
      return true;
    })
    .map<ImpactServiceMapEdge>(
      ({
        id,
        type_id: typeId,
        source_id: source,
        target_id: target,
        on_critical_path,
        label: edgeLabel,
        source: found,
        confidence,
      }) => {
        const onCriticalPath = on_critical_path === true;
        const eventCount = eventCounts.get(id) ?? 0;
        const typeLabel = relationshipLabels.get(typeId) ?? typeId;
        // A guess is drawn as one: dashed, so nobody mistakes a hypothesis for something observed.
        const inferred = found === 'inferred' || confidence === 'low';
        // Generic verbs ("runs on", "calls", "manages") repeat on every trunk edge and stack into
        // an unreadable column. Only paint a label when the model added a specific one, or when
        // the edge itself carries events — the thick path already shows the critical route.
        const label = (() => {
          if (!onCriticalPath) return undefined;
          const custom = edgeLabel?.trim();
          if (custom && eventCount > 0) {
            return i18n.translate('xpack.apm.impactMap.edgeLabelWithEvents', {
              defaultMessage: '{label} · {count, plural, one {# event} other {# events}}',
              values: { label: custom, count: eventCount },
            });
          }
          if (custom) return custom;
          if (eventCount > 0) {
            return i18n.translate('xpack.apm.impactMap.edgeEventsOnly', {
              defaultMessage: '{count, plural, one {# event} other {# events}}',
              values: { count: eventCount },
            });
          }
          return undefined;
        })();
        return {
          id,
          source,
          target,
          // Custom edge: label sits above the stroke so it cannot be dashed through.
          type: 'impact',
          // Screen readers still get the relationship type when nothing is drawn on the path.
          ariaLabel: edgeLabel?.trim() || typeLabel,
          ...(label !== undefined ? { label } : {}),
          style: {
            ...(onCriticalPath
              ? { stroke: colors.criticalPath, strokeWidth: CRITICAL_PATH_STROKE_WIDTH }
              : CONTEXT_EDGE_STYLE),
            ...(inferred ? { strokeDasharray: '6 4' } : {}),
          },
          markerEnd: onCriticalPath ? createEdgeMarker(colors.criticalPath) : createEdgeMarker(),
          // Animation reads as a dashed busy line; a solid critical path is clearer.
          animated: false,
          // Labelled critical edges stay above quieter context links.
          zIndex: label !== undefined ? 2 : onCriticalPath ? 1 : 0,
          data: { onCriticalPath, eventCount, inferred },
        };
      }
    );

  return { nodes, edges };
};
