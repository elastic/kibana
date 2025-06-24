/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeProgressionEvent } from '@kbn/wc-framework-types-common';

/**
 * Subset of the properties of a {@link NodeProgressionEvent} that needs to be specified
 * by the emitter.
 */
export type NodeProgressionReporterEvent = Pick<NodeProgressionEvent, 'label' | 'data'>;

/**
 * Event reporter that can be used to report real time progress, or telemetry events from a node run.
 */
export interface NodeEventReporter {
  reportProgress(event: NodeProgressionReporterEvent): void;
}
