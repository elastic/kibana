/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Location } from 'history';
import type * as t from 'io-ts';
import type { ApmRouter } from '../routing/apm_route_config';

// Structural view over the io-ts codecs we introspect (all codecs carry `_tag`).
interface TaggedCodec {
  _tag?: string;
  props?: t.Props;
  types?: t.Mixed[];
  type?: t.Mixed;
}

// Collects the keys a codec declares as required (`t.partial`/unions are ignored).
function collectRequiredKeys(codec: t.Mixed, keys: Set<string>): void {
  const tagged = codec as TaggedCodec;
  switch (tagged._tag) {
    case 'InterfaceType':
      Object.keys(tagged.props ?? {}).forEach((key) => keys.add(key));
      break;
    case 'IntersectionType':
      (tagged.types ?? []).forEach((member) => collectRequiredKeys(member, keys));
      break;
    case 'ExactType':
    case 'RefinementType':
      if (tagged.type) {
        collectRequiredKeys(tagged.type, keys);
      }
      break;
    default:
      break;
  }
}

// Finds the codecs assigned to `query` in a required position (`t.partial` query
// is optional and ignored).
function collectRequiredQueryCodecs(codec: t.Mixed, out: t.Mixed[]): void {
  const tagged = codec as TaggedCodec;
  switch (tagged._tag) {
    case 'InterfaceType':
      if (tagged.props && 'query' in tagged.props) {
        out.push(tagged.props.query);
      }
      break;
    case 'IntersectionType':
      (tagged.types ?? []).forEach((member) => collectRequiredQueryCodecs(member, out));
      break;
    case 'ExactType':
    case 'RefinementType':
      if (tagged.type) {
        collectRequiredQueryCodecs(tagged.type, out);
      }
      break;
    default:
      break;
  }
}

interface RouteWithParams {
  params?: t.Mixed;
}

// Derives the query params required by any route matching the current location,
// so redirect guards cover every such route without a hardcoded allowlist.
function getRequiredQueryKeys({
  apmRouter,
  location,
}: {
  apmRouter: ApmRouter;
  location: Location;
}): Set<string> {
  const keys = new Set<string>();

  let matchingRoutes: RouteWithParams[];
  try {
    matchingRoutes = apmRouter.getRoutesToMatch(
      location.pathname || '/'
    ) as unknown as RouteWithParams[];
  } catch {
    // No matching route: nothing to guard.
    return keys;
  }

  for (const route of matchingRoutes) {
    if (!route.params) {
      continue;
    }
    const queryCodecs: t.Mixed[] = [];
    collectRequiredQueryCodecs(route.params, queryCodecs);
    queryCodecs.forEach((queryCodec) => collectRequiredKeys(queryCodec, keys));
  }

  return keys;
}

export function isRouteWithTimeRange({
  apmRouter,
  location,
}: {
  apmRouter: ApmRouter;
  location: Location;
}) {
  const requiredKeys = getRequiredQueryKeys({ apmRouter, location });
  return requiredKeys.has('rangeFrom') && requiredKeys.has('rangeTo');
}

export function isRouteWithComparison({
  apmRouter,
  location,
}: {
  apmRouter: ApmRouter;
  location: Location;
}) {
  const requiredKeys = getRequiredQueryKeys({ apmRouter, location });
  return requiredKeys.has('comparisonEnabled');
}
