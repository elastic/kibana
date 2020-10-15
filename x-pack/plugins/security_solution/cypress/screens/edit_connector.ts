/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ids } from '../objects/case';

export const CONNECTOR_SELECTOR = '[data-test-subj="dropdown-connectors"]';
export const SELECT_JIRA = `[data-test-subj="dropdown-connector-${ids.jira}"]`;
export const SELECT_RESILIENT = `[data-test-subj="dropdown-connector-${ids.resilient}"]`;
export const SELECT_SN = `[data-test-subj="dropdown-connector-${ids.sn}"]`;

export const SELECT_ISSUE_TYPE = `[data-test-subj="issueTypeSelect"]`;
export const SELECT_PRIORITY = `[data-test-subj="prioritySelect"]`;
export const SELECT_INCIDENT_TYPE = `[data-test-subj="incidentTypeComboBox"]`;
export const SELECT_SEVERITY = `[data-test-subj="severitySelect"]`;

export const SELECT_URGENCY = `[data-test-subj="urgencySelect"]`;

export const SELECT_IMPACT = `[data-test-subj="impactSelect"]`;

export const CONNECTOR_TITLE = `[data-test-subj="settings-connector-card"] span.euiTitle`;
