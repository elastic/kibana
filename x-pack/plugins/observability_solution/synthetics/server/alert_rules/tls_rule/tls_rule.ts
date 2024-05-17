/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionGroupIdsOf } from '@kbn/alerting-plugin/common';
import { GetViewInAppRelativeUrlFnOpts } from '@kbn/alerting-plugin/server';
import { schema } from '@kbn/config-schema';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import {
  AlertsLocatorParams,
  alertsLocatorID,
  getAlertUrl,
  observabilityPaths,
} from '@kbn/observability-plugin/common';
import { ALERT_REASON, ALERT_UUID } from '@kbn/rule-data-utils';
import { IRuleDataClient, createLifecycleRuleTypeFactory } from '@kbn/rule-registry-plugin/server';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { asyncForEach } from '@kbn/std';
import {
  SYNTHETICS_ALERT_RULE_TYPES,
  TLS_CERTIFICATE,
} from '../../../common/constants/synthetics_alerts';
import {
  CERT_COMMON_NAME,
  CERT_HASH_SHA256,
  CERT_ISSUER_NAME,
  CERT_VALID_NOT_AFTER,
  CERT_VALID_NOT_BEFORE,
} from '../../../common/field_names';
import { TlsTranslations } from '../../../common/rules/synthetics/translations';
import { SyntheticsCommonState } from '../../../common/runtime_types/alert_rules/common';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { SyntheticsPluginsSetupDependencies, SyntheticsServerSetup } from '../../types';
import { ALERT_DETAILS_URL, getActionVariables } from '../action_variables';
import { UptimeRuleTypeAlertDefinition, generateAlertMessage, updateState } from '../common';
import { getCertSummary, setTLSRecoveredAlertsContext } from './message_utils';
import { TLSRuleExecutor } from './tls_rule_executor';

export type ActionGroupIds = ActionGroupIdsOf<typeof TLS_CERTIFICATE>;

export const registerSyntheticsTLSCheckRule = (
  server: SyntheticsServerSetup,
  plugins: SyntheticsPluginsSetupDependencies,
  syntheticsMonitorClient: SyntheticsMonitorClient,
  ruleDataClient: IRuleDataClient
) => {
  const createLifecycleRuleType = createLifecycleRuleTypeFactory({
    ruleDataClient,
    logger: server.logger,
  });

  return createLifecycleRuleType({
    id: SYNTHETICS_ALERT_RULE_TYPES.TLS,
    category: DEFAULT_APP_CATEGORIES.observability.id,
    producer: 'uptime',
    name: TLS_CERTIFICATE.name,
    validate: {
      params: schema.object({
        search: schema.maybe(schema.string()),
        certExpirationThreshold: schema.maybe(schema.number()),
        certAgeThreshold: schema.maybe(schema.number()),
      }),
    },
    defaultActionGroupId: TLS_CERTIFICATE.id,
    actionGroups: [TLS_CERTIFICATE],
    actionVariables: getActionVariables({ plugins }),
    isExportable: true,
    minimumLicenseRequired: 'basic',
    doesSetRecoveryContext: true,
    async executor({ state, params, services, spaceId, previousStartedAt, startedAt }) {
      const ruleState = state as SyntheticsCommonState;

      const { basePath, share } = server;
      const alertsLocator: LocatorPublic<AlertsLocatorParams> | undefined =
        share.url.locators.get(alertsLocatorID);

      const {
        alertFactory,
        getAlertUuid,
        savedObjectsClient,
        scopedClusterClient,
        alertWithLifecycle,
        getAlertStartedDate,
      } = services;

      const tlsRule = new TLSRuleExecutor(
        previousStartedAt,
        params,
        savedObjectsClient,
        scopedClusterClient.asCurrentUser,
        server,
        syntheticsMonitorClient
      );

      const { foundCerts, certs, absoluteExpirationThreshold, absoluteAgeThreshold, latestPings } =
        await tlsRule.getExpiredCertificates();

      await asyncForEach(certs, async (cert) => {
        const summary = getCertSummary(cert, absoluteExpirationThreshold, absoluteAgeThreshold);

        if (!summary.summary || !summary.status) {
          return;
        }

        const alertId = cert.sha256;
        const alertUuid = getAlertUuid(alertId);
        const indexedStartedAt = getAlertStartedDate(alertId) ?? startedAt.toISOString();

        const alertInstance = alertWithLifecycle({
          id: alertId,
          fields: {
            [CERT_COMMON_NAME]: cert.common_name,
            [CERT_ISSUER_NAME]: cert.issuer,
            [CERT_VALID_NOT_AFTER]: cert.not_after,
            [CERT_VALID_NOT_BEFORE]: cert.not_before,
            [CERT_HASH_SHA256]: cert.sha256,
            [ALERT_UUID]: alertUuid,
            [ALERT_REASON]: generateAlertMessage(TlsTranslations.defaultActionMessage, summary),
          },
        });

        alertInstance.replaceState({
          ...updateState(ruleState, foundCerts),
          ...summary,
        });

        alertInstance.scheduleActions(TLS_CERTIFICATE.id, {
          [ALERT_DETAILS_URL]: await getAlertUrl(
            alertUuid,
            spaceId,
            indexedStartedAt,
            alertsLocator,
            basePath.publicBaseUrl
          ),
          ...summary,
        });
      });

      await setTLSRecoveredAlertsContext({
        alertFactory,
        basePath,
        defaultStartedAt: startedAt.toISOString(),
        getAlertStartedDate,
        getAlertUuid,
        spaceId,
        alertsLocator,
        latestPings,
      });

      return { state: updateState(ruleState, foundCerts) };
    },
    alerts: UptimeRuleTypeAlertDefinition,
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  });
};
