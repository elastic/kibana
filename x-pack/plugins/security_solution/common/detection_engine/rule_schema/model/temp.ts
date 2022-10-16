/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { listArray } from '@kbn/securitysolution-io-ts-list-types';
import { max_signals, threat } from '@kbn/securitysolution-io-ts-alerting-types';

export type BuildingBlockType = t.TypeOf<typeof BuildingBlockType>;
export const BuildingBlockType = t.string;

export type AlertsIndex = t.TypeOf<typeof AlertsIndex>;
export const AlertsIndex = t.string;

export type AlertsIndexNamespace = t.TypeOf<typeof AlertsIndexNamespace>;
export const AlertsIndexNamespace = t.string;

export type ExceptionListArray = t.TypeOf<typeof ExceptionListArray>;
export const ExceptionListArray = listArray;

export type MaxSignals = t.TypeOf<typeof MaxSignals>;
export const MaxSignals = max_signals;

export type ThreatArray = t.TypeOf<typeof ThreatArray>;
export const ThreatArray = t.array(threat);

export type IndexPatternArray = t.TypeOf<typeof IndexPatternArray>;
export const IndexPatternArray = t.array(t.string);

export type DataViewId = t.TypeOf<typeof DataViewId>;
export const DataViewId = t.string;

export type RuleQuery = t.TypeOf<typeof RuleQuery>;
export const RuleQuery = t.string;

/**
 * TODO: Right now the filters is an "unknown", when it could more than likely
 * become the actual ESFilter as a type.
 */
export type RuleFilterArray = t.TypeOf<typeof RuleFilterArray>; // Filters are not easily type-able yet
export const RuleFilterArray = t.array(t.unknown); // Filters are not easily type-able yet
