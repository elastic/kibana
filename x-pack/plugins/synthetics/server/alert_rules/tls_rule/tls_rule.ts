/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ActionGroupIdsOf } from '@kbn/alerting-plugin/common';
import { createLifecycleRuleTypeFactory, IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { asyncForEach } from '@kbn/std';
import { ALERT_REASON, ALERT_UUID } from '@kbn/rule-data-utils';
import {
  alertsLocatorID,
  AlertsLocatorParams,
  getAlertUrl,
} from '@kbn/observability-plugin/common';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { SyntheticsCommonState } from '../../../common/runtime_types/alert_rules/common';
import { UptimeCorePluginsSetup, UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { OverviewStatus } from '../../../common/runtime_types';
import { TLSRuleExecutor } from './tls_rule_executor';
import { StatusRulePramsSchema } from '../../../common/rules/status_rule';
import {
  SYNTHETICS_ALERT_RULE_TYPES,
  TLS_CERTIFICATE,
} from '../../../common/constants/synthetics_alerts';
import { updateState } from '../common';
import { getActionVariables } from '../action_variables';
import { ALERT_DETAILS_URL } from '../../legacy_uptime/lib/alerts/action_variables';
import { UMServerLibs } from '../../legacy_uptime/uptime_server';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import {
  generateAlertMessage,
  setRecoveredAlertsContext,
  UptimeRuleTypeAlertDefinition,
} from '../../legacy_uptime/lib/alerts/common';
import { TlsTranslations } from '../../../common/rules/legacy_uptime/translations';
import { TLS } from '../../../common/constants/uptime_alerts';
import { getCertSummary } from '../../legacy_uptime/lib/alerts/tls';

export type ActionGroupIds = ActionGroupIdsOf<typeof TLS_CERTIFICATE>;

export const registerSyntheticsTLSCheckRule = (
  server: UptimeServerSetup,
  libs: UMServerLibs,
  plugins: UptimeCorePluginsSetup,
  syntheticsMonitorClient: SyntheticsMonitorClient,
  ruleDataClient: IRuleDataClient
) => {
  const createLifecycleRuleType = createLifecycleRuleTypeFactory({
    ruleDataClient,
    logger: server.logger,
  });

  return createLifecycleRuleType({
    id: SYNTHETICS_ALERT_RULE_TYPES.TLS,
    producer: 'uptime',
    name: TLS_CERTIFICATE.name,
    validate: {
      params: StatusRulePramsSchema,
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

      const { foundCerts, certs, absoluteExpirationThreshold, absoluteAgeThreshold } =
        await tlsRule.getExpiredCertificates(
          ruleState.meta?.downConfigs as OverviewStatus['downConfigs']
        );

      if (foundCerts) {
        await asyncForEach(certs, async (cert) => {
          const summary = getCertSummary(cert, absoluteExpirationThreshold, absoluteAgeThreshold);

          if (!summary.summary || !summary.status) {
            return;
          }

          const alertId = `${cert.common_name}-${cert.issuer?.replace(/\s/g, '_')}-${cert.sha256}`;
          const alertUuid = getAlertUuid(alertId);
          const indexedStartedAt = getAlertStartedDate(alertId) ?? startedAt.toISOString();

          const alertInstance = alertWithLifecycle({
            id: alertId,
            fields: {
              'tls.server.x509.subject.common_name': cert.common_name,
              'tls.server.x509.issuer.common_name': cert.issuer,
              'tls.server.x509.not_after': cert.not_after,
              'tls.server.x509.not_before': cert.not_before,
              'tls.server.hash.sha256': cert.sha256,
              [ALERT_REASON]: generateAlertMessage(TlsTranslations.defaultActionMessage, summary),
              [ALERT_UUID]: alertUuid,
            },
          });

          alertInstance.replaceState({
            ...updateState(ruleState, foundCerts),
            ...summary,
          });

          alertInstance.scheduleActions(TLS.id, {
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
      }

      await setRecoveredAlertsContext({
        alertFactory,
        basePath,
        defaultStartedAt: startedAt.toISOString(),
        getAlertStartedDate,
        getAlertUuid,
        spaceId,
        alertsLocator,
      });

      return { state: updateState(ruleState, foundCerts) };
    },
    alerts: UptimeRuleTypeAlertDefinition,
  });
};
