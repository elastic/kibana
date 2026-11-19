/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Location } from 'history';
import { isZod, z } from '@kbn/zod/v4';
import type { ApmRouter } from '../routing/apm_route_config';

// A key is optional when its schema is `ZodOptional` (the zod mirror of io-ts's
// `t.partial`). This is structural, not value-based: fields like
// `BooleanFromString.default(false)` accept `undefined` at runtime but are still
// declared (required) keys, exactly as `toBooleanRt` was inside `t.type`.
function isOptionalField(schema: z.ZodType): boolean {
  return schema instanceof z.ZodOptional;
}

// Returns the object shape of a zod schema (ZodObject / merged object), or
// undefined if it isn't object-like. zod flattens `.merge()` into a single
// object shape, so no intersection walk is needed (unlike the io-ts version).
function getObjectShape(schema: z.ZodType): Record<string, z.ZodType> | undefined {
  const shape = (schema as unknown as { shape?: Record<string, z.ZodType> }).shape;
  return shape && typeof shape === 'object' ? shape : undefined;
}

// Collects the query keys a route's params declare as required. A `query` in an
// optional position (io-ts `t.partial`, zod `.optional()`) declares nothing.
function collectRequiredQueryKeys(params: z.ZodType, keys: Set<string>): void {
  const shape = getObjectShape(params);
  const querySchema = shape?.query;
  if (!querySchema || isOptionalField(querySchema)) {
    return;
  }

  const queryShape = getObjectShape(querySchema);
  if (!queryShape) {
    return;
  }

  for (const [key, fieldSchema] of Object.entries(queryShape)) {
    if (!isOptionalField(fieldSchema)) {
      keys.add(key);
    }
  }
}

interface RouteWithParams {
  params?: unknown;
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
    if (route.params && isZod(route.params)) {
      collectRequiredQueryKeys(route.params, keys);
    }
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
