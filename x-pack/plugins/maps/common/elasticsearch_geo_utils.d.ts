/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MapExtent } from './descriptor_types';

export function scaleBounds(bounds: MapExtent, scaleFactor: number): MapExtent;

export function turfBboxToBounds(turfBbox: unknown): MapExtent;

export function clampToLatBounds(lat: number): number;

export function clampToLonBounds(lon: number): number;
