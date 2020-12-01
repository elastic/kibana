/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connectorIds } from '../objects/case';

export const CONNECTOR_RESILIENT = `[data-test-subj="connector-settings-resilient"]`;

export const CONNECTOR_SELECTOR = '[data-test-subj="dropdown-connectors"]';

export const SELECT_IMPACT = `[data-test-subj="impactSelect"]`;

export const SELECT_INCIDENT_TYPE = `[data-test-subj="incidentTypeComboBox"] input[data-test-subj="comboBoxSearchInput"]`;

export const SELECT_ISSUE_TYPE = `[data-test-subj="issueTypeSelect"]`;

export const SELECT_JIRA = `[data-test-subj="dropdown-connector-${connectorIds.jira}"]`;

export const SELECT_PRIORITY = `[data-test-subj="prioritySelect"]`;

export const SELECT_RESILIENT = `[data-test-subj="dropdown-connector-${connectorIds.resilient}"]`;

export const SELECT_SEVERITY = `[data-test-subj="severitySelect"]`;

export const SELECT_SN = `[data-test-subj="dropdown-connector-${connectorIds.sn}"]`;

export const SELECT_URGENCY = `[data-test-subj="urgencySelect"]`;
