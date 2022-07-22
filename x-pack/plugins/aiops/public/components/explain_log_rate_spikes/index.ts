/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The usage of the components in this folder works like this:
 *
 * <ExplainLogRateSpikesAppState>
 *   <ExplainLogRateSpikesPageProps>
 *     <ExplainLogRateSpikesAnalysis>
 *
 * - `ExplainLogRateSpikesAppState`: Manages and passes down url/app state related data, e.g. search parameters.
 * - `ExplainLogRateSpikesPageProps`: The overall page layout. Includes state management for data selection
 *   like date range, data fetching for the document count chart, window parameters for the analysis.
 * - `ExplainLogRateSpikesAnalysis`: Hosts the analysis results table including code to fetch its data.
 *   While for example the earliest/latest parameter can still be `undefined` on load in the upper component,
 *   this component expects all necessary parameters/props already to be defined. The reason is the usage of
 *   data fetching hooks which cannot be called conditionally, so the pattern used here is to only load this
 *   whole component conditionally on the outer level.
 */

export type { ExplainLogRateSpikesAppStateProps } from './explain_log_rate_spikes_app_state';
import { ExplainLogRateSpikesAppState } from './explain_log_rate_spikes_app_state';

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default ExplainLogRateSpikesAppState;
