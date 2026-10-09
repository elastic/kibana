/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import {
  ALERT_RULE_CONSUMER,
  ALERT_RULE_TYPE_ID,
  ALERT_WORKFLOW_STATUS,
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  SPACE_IDS,
} from '@kbn/rule-data-utils';

/**
 * Stand-ins for `.alerts-security.attack.discovery.alerts-default` and
 * `.alerts-security.alerts-default`. Attaching and status syncing are index-agnostic — both read
 * the attachment's `metadata.index` — so dedicated test indices exercise the same code paths
 * without depending on the detection engine's or the attack discovery schedule's index templates.
 *
 * The `.alerts` prefix is load bearing: alerting RBAC reads the referenced documents as the
 * internal `kibana_system` user, which is only privileged on `.alerts*`. An ordinary index name
 * makes that read return no `_source`, and the authorization check then has no rule type or
 * consumer to assert on and silently passes.
 */
export const ATTACK_INDEX = '.alerts-test-cases-attack-discovery';
export const ALERT_INDEX = '.alerts-test-cases-attack-constituent';

/**
 * The fields the Cases platform requires of an attack reference before it will persist the
 * attachment: the document must exist, be an `attack-discovery` AAD alert the caller is authorized
 * to read, and belong to the current space.
 */
export const buildAttackDocument = (spaceId = 'default') => ({
  '@timestamp': new Date().toISOString(),
  [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  [ALERT_RULE_CONSUMER]: 'siem',
  [SPACE_IDS]: [spaceId],
  [ALERT_WORKFLOW_STATUS]: 'open',
});

export const buildAlertDocument = (spaceId = 'default') => ({
  '@timestamp': new Date().toISOString(),
  [ALERT_RULE_TYPE_ID]: 'siem.queryRule',
  [ALERT_RULE_CONSUMER]: 'siem',
  [SPACE_IDS]: [spaceId],
  [ALERT_WORKFLOW_STATUS]: 'open',
});

/** Indexes the attack discovery documents (and optionally their constituent alerts) under test. */
export const indexAttackDocuments = async ({
  es,
  attackIds,
  alertIds = [],
  spaceId = 'default',
}: {
  es: Client;
  attackIds: string[];
  alertIds?: string[];
  spaceId?: string;
}): Promise<void> => {
  await Promise.all([
    ...attackIds.map((id) =>
      es.index({ index: ATTACK_INDEX, id, document: buildAttackDocument(spaceId) })
    ),
    ...alertIds.map((id) =>
      es.index({ index: ALERT_INDEX, id, document: buildAlertDocument(spaceId) })
    ),
  ]);

  await es.indices.refresh({
    index: alertIds.length > 0 ? [ATTACK_INDEX, ALERT_INDEX] : ATTACK_INDEX,
  });
};

export const deleteAttackDocuments = async (es: Client): Promise<void> => {
  await es.indices.delete({ index: [ATTACK_INDEX, ALERT_INDEX], ignore_unavailable: true });
};
