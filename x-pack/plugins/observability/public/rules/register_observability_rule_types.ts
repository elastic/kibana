/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import {
  ALERT_REASON,
  ALERT_RULE_PARAMETERS,
  ALERT_START,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import { LogsExplorerLocatorParams } from '@kbn/deeplinks-observability';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { MetricExpression } from '../components/custom_threshold/types';
import type {
  CustomMetricExpressionParams,
  CustomThresholdExpressionMetric,
} from '../../common/custom_threshold_rule/types';
import { getViewInAppUrl } from '../../common/custom_threshold_rule/get_view_in_app_url';
import { SLO_ID_FIELD, SLO_INSTANCE_ID_FIELD } from '../../common/field_names/slo';
import { ObservabilityRuleTypeRegistry } from './create_observability_rule_type_registry';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '../../common/constants';
import { validateBurnRateRule } from '../components/burn_rate_rule_editor/validation';
import { validateCustomThreshold } from '../components/custom_threshold/components/validation';

const sloBurnRateDefaultActionMessage = i18n.translate(
  'xpack.observability.slo.rules.burnRate.defaultActionMessage',
  {
    defaultMessage: `\\{\\{context.reason\\}\\}

\\{\\{rule.name\\}\\} is active with the following conditions:

- SLO: \\{\\{context.sloName\\}\\}'
- The burn rate over the last \\{\\{context.longWindow.duration\\}\\} is \\{\\{context.longWindow.burnRate\\}\\}
- The burn rate over the last \\{\\{context.shortWindow.duration\\}\\} is \\{\\{context.shortWindow.burnRate\\}\\}
- Threshold: \\{\\{context.burnRateThreshold\\}\\}

[View alert details](\\{\\{context.alertDetailsUrl\\}\\})
`,
  }
);
const sloBurnRateDefaultRecoveryMessage = i18n.translate(
  'xpack.observability.slo.rules.burnRate.defaultRecoveryMessage',
  {
    defaultMessage: `\\{\\{context.reason\\}\\}

\\{\\{rule.name\\}\\} has recovered.

- SLO: \\{\\{context.sloName\\}\\}'
- The burn rate over the last \\{\\{context.longWindow.duration\\}\\} is \\{\\{context.longWindow.burnRate\\}\\}
- The burn rate over the last \\{\\{context.shortWindow.duration\\}\\} is \\{\\{context.shortWindow.burnRate\\}\\}
- Threshold: \\{\\{context.burnRateThreshold\\}\\}

[View alert details](\\{\\{context.alertDetailsUrl\\}\\})
`,
  }
);

const thresholdDefaultActionMessage = i18n.translate(
  'xpack.observability.customThreshold.rule.alerting.threshold.defaultActionMessage',
  {
    defaultMessage: `\\{\\{context.reason\\}\\}

\\{\\{rule.name\\}\\} is active.

[View alert details](\\{\\{context.alertDetailsUrl\\}\\})
`,
  }
);
const thresholdDefaultRecoveryMessage = i18n.translate(
  'xpack.observability.customThreshold.rule.alerting.threshold.defaultRecoveryMessage',
  {
    defaultMessage: `\\{\\{rule.name\\}\\} has recovered.

[View alert details](\\{\\{context.alertDetailsUrl\\}\\})
`,
  }
);

const getDataViewId = (searchConfiguration?: SerializedSearchSourceFields) =>
  typeof searchConfiguration?.index === 'string'
    ? searchConfiguration.index
    : searchConfiguration?.index?.title;

export const registerObservabilityRuleTypes = async (
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry,
  uiSettings: IUiSettingsClient,
  logsExplorerLocator?: LocatorPublic<LogsExplorerLocatorParams>
) => {
  observabilityRuleTypeRegistry.register({
    id: SLO_BURN_RATE_RULE_TYPE_ID,
    description: i18n.translate('xpack.observability.slo.rules.burnRate.description', {
      defaultMessage: 'Alert when your SLO burn rate is too high over a defined period of time.',
    }),
    format: ({ fields }) => {
      return {
        reason: fields[ALERT_REASON] ?? '-',
        link: `/app/observability/slos/${fields[SLO_ID_FIELD]}?instanceId=${
          fields[SLO_INSTANCE_ID_FIELD] ?? '*'
        }`,
      };
    },
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.observability.sloBurnRateRule}`;
    },
    ruleParamsExpression: lazy(() => import('../components/burn_rate_rule_editor')),
    validate: validateBurnRateRule,
    requiresAppContext: false,
    defaultActionMessage: sloBurnRateDefaultActionMessage,
    defaultRecoveryMessage: sloBurnRateDefaultRecoveryMessage,
    alertDetailsAppSection: lazy(
      () => import('../components/slo/burn_rate/alert_details/alert_details_app_section')
    ),
    priority: 100,
  });
  const validateCustomThresholdWithUiSettings = ({
    criteria,
    searchConfiguration,
  }: {
    criteria: CustomMetricExpressionParams[];
    searchConfiguration: SerializedSearchSourceFields;
  }) => validateCustomThreshold({ criteria, searchConfiguration, uiSettings });
  observabilityRuleTypeRegistry.register({
    id: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
    description: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.alertDescription',
      {
        defaultMessage: 'Alert when any Observability data type reaches or exceeds a given value.',
      }
    ),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.observability.customThreshold}`;
    },
    ruleParamsExpression: lazy(
      () => import('../components/custom_threshold/custom_threshold_rule_expression')
    ),
    validate: validateCustomThresholdWithUiSettings,
    defaultActionMessage: thresholdDefaultActionMessage,
    defaultRecoveryMessage: thresholdDefaultRecoveryMessage,
    requiresAppContext: false,
    format: ({ fields }) => {
      const searchConfiguration = fields[ALERT_RULE_PARAMETERS]?.searchConfiguration as
        | SerializedSearchSourceFields
        | undefined;
      const criteria = fields[ALERT_RULE_PARAMETERS]?.criteria as MetricExpression[];
      const metrics: CustomThresholdExpressionMetric[] =
        criteria.length === 1 ? criteria[0].metrics : [];

      const dataViewId = getDataViewId(searchConfiguration);
      return {
        reason: fields[ALERT_REASON] ?? '-',
        link: getViewInAppUrl({
          metrics,
          startedAt: fields[ALERT_START],
          logsExplorerLocator,
          filter: (searchConfiguration?.query as { query: string }).query,
          dataViewId,
        }),
        hasBasePath: true,
      };
    },
    alertDetailsAppSection: lazy(
      () =>
        import(
          '../components/custom_threshold/components/alert_details_app_section/alert_details_app_section'
        )
    ),
    priority: 5,
  });
};
