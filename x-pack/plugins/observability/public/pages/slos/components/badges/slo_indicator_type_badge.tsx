/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { euiLightVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';

import { useKibana } from '../../../../utils/kibana_react';
import { convertSliApmParamsToApmAppDeeplinkUrl } from '../../../../utils/slo/convert_sli_apm_params_to_apm_app_deeplink_url';
import { isApmIndicatorType } from '../../../../utils/slo/indicator';
import { toIndicatorTypeLabel } from '../../../../utils/slo/labels';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloIndicatorTypeBadge({ slo }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  const handleNavigateToApm = () => {
    if (
      slo.indicator.type === 'sli.apm.transactionDuration' ||
      slo.indicator.type === 'sli.apm.transactionErrorRate'
    ) {
      const {
        indicator: {
          params: { environment, filter, service, transactionName, transactionType },
        },
        timeWindow: { duration },
      } = slo;

      const url = convertSliApmParamsToApmAppDeeplinkUrl({
        duration,
        environment,
        filter,
        service,
        transactionName,
        transactionType,
      });

      navigateToUrl(basePath.prepend(url));
    }
  };

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiBadge color={euiLightVars.euiColorDisabled}>
          {toIndicatorTypeLabel(slo.indicator.type)}
        </EuiBadge>
      </EuiFlexItem>
      {isApmIndicatorType(slo.indicator.type) && 'service' in slo.indicator.params && (
        <EuiFlexItem grow={false} style={{ maxWidth: 100 }}>
          <EuiToolTip
            position="top"
            content={i18n.translate('xpack.observability.slo.indicatorTypeBadge.exploreInApm', {
              defaultMessage: 'View {service} details',
              values: { service: slo.indicator.params.service },
            })}
          >
            <EuiBadge
              color={euiLightVars.euiColorDisabled}
              onClick={handleNavigateToApm}
              onClickAriaLabel={i18n.translate(
                'xpack.observability.slo.indicatorTypeBadge.exploreInApm',
                {
                  defaultMessage: 'View {service} details',
                  values: { service: slo.indicator.params.service },
                }
              )}
            >
              {slo.indicator.params.service}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </>
  );
}
