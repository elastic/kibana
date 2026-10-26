/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
} from '@kbn/elastic-assistant-common';
import {
  ALERT_RULE_CONSUMER,
  ALERT_RULE_TYPE_ID,
  ALERT_WORKFLOW_STATUS,
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  SPACE_IDS,
} from '@kbn/rule-data-utils';
import {
  ATTACK_DISCOVERY_TEST_ALIAS,
  ATTACK_DISCOVERY_TEST_BACKING_INDEX,
} from '../../../../common/lib/constants';

/**
 * Stand-ins for the scheduled and ad-hoc attack discovery indices and for
 * `.alerts-security.alerts-default`.
 *
 * The Cases platform refuses an attack whose `metadata.index` is outside the two attack discovery
 * families, and reads the rest as the caller through the pattern `toReadableAttackIndexPattern` maps
 * the index to. So the scheduled fixture is a backing index behind an alias, the way the alerting
 * framework lays one out: attachments carry the backing index, as the find API returns it, and only
 * the alias matches the pattern. The ad-hoc fixture is a plain index the ad-hoc pattern matches
 * directly.
 *
 * Every name is inside a family the internal `kibana_system` user is privileged on (`.alerts*`,
 * `.internal.alerts*`, `.adhoc.alerts*`). That is load bearing: alerting RBAC reads the referenced
 * documents as that user, and a read it is not privileged for returns no `_source`, leaving the
 * authorization check with no rule type or consumer to assert on, so it silently passes. The fixtures
 * themselves are written through the test's superuser `es` client, which can write all of them.
 */
export const ATTACK_INDEX = ATTACK_DISCOVERY_TEST_BACKING_INDEX;
export const ATTACK_ALIAS = ATTACK_DISCOVERY_TEST_ALIAS;
export const AD_HOC_ATTACK_INDEX = '.adhoc.alerts-security.attack.discovery.alerts-test-cases';
export const ALERT_INDEX = '.alerts-test-cases-attack-constituent';

/**
 * The fields the Cases platform requires of an attack reference before it will persist the
 * attachment: the document must exist, be an attack discovery AAD alert the caller is authorized
 * to read, and belong to the current space.
 */
export const buildAttackDocument = (spaceId = 'default') => ({
  '@timestamp': new Date().toISOString(),
  [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  [ALERT_RULE_CONSUMER]: 'siem',
  [SPACE_IDS]: [spaceId],
  [ALERT_WORKFLOW_STATUS]: 'open',
});

/**
 * An ad-hoc attack discovery — the shape written by a manual "Generate" run. It is accepted on the
 * same terms as a scheduled one: ad-hoc discoveries are always visible, so the user recorded on the
 * document filters them rather than hiding them. Its rule type is a sentinel the alerting framework
 * never registers, so the caller's Elasticsearch index privileges authorize it instead.
 */
export const buildAdHocAttackDocument = (spaceId = 'default') => ({
  '@timestamp': new Date().toISOString(),
  [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
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

/** Creates the scheduled attack backing index and its alias, as the alerting framework does. */
const ensureAttackIndex = async (es: Client): Promise<void> => {
  if (await es.indices.exists({ index: ATTACK_INDEX })) {
    return;
  }

  await es.indices.create({
    index: ATTACK_INDEX,
    settings: { index: { hidden: true } },
    aliases: { [ATTACK_ALIAS]: { is_write_index: true, is_hidden: true } },
  });
};

/** Indexes the attack discovery documents (and optionally their constituent alerts) under test. */
export const indexAttackDocuments = async ({
  es,
  attackIds,
  adHocAttackIds = [],
  alertIds = [],
  alertIdsByAttackId = {},
  spaceId = 'default',
}: {
  es: Client;
  attackIds: string[];
  adHocAttackIds?: string[];
  alertIds?: string[];
  /** Constituent alert ids to record on a scheduled attack, as a real discovery carries them. */
  alertIdsByAttackId?: Record<string, string[]>;
  spaceId?: string;
}): Promise<void> => {
  await ensureAttackIndex(es);

  await Promise.all([
    ...attackIds.map((id) =>
      es.index({
        index: ATTACK_ALIAS,
        id,
        document: {
          ...buildAttackDocument(spaceId),
          ...(alertIdsByAttackId[id] != null
            ? { [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: alertIdsByAttackId[id] }
            : {}),
        },
      })
    ),
    ...adHocAttackIds.map((id) =>
      es.index({ index: AD_HOC_ATTACK_INDEX, id, document: buildAdHocAttackDocument(spaceId) })
    ),
    ...alertIds.map((id) =>
      es.index({ index: ALERT_INDEX, id, document: buildAlertDocument(spaceId) })
    ),
  ]);

  await es.indices.refresh({
    index: [
      ATTACK_INDEX,
      ...(adHocAttackIds.length > 0 ? [AD_HOC_ATTACK_INDEX] : []),
      ...(alertIds.length > 0 ? [ALERT_INDEX] : []),
    ],
  });
};

/** Deleting the backing index removes its alias with it. */
export const deleteAttackDocuments = async (es: Client): Promise<void> => {
  await es.indices.delete({
    index: [ATTACK_INDEX, AD_HOC_ATTACK_INDEX, ALERT_INDEX],
    ignore_unavailable: true,
  });
};
