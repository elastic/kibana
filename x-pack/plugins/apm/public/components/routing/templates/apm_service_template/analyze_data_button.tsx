/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import {
  createExploratoryViewUrl,
  SeriesUrl,
} from '../../../../../../observability/public';
import { ALL_VALUES_SELECTED } from '../../../../../../observability/public';
import {
  isIosAgentName,
  isRumAgentName,
} from '../../../../../common/agent_name';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../../../common/elasticsearch_fieldnames';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../../common/environment_filter_values';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';

function getEnvironmentDefinition(environment?: string) {
  switch (environment) {
    case ENVIRONMENT_ALL.value:
      return { [SERVICE_ENVIRONMENT]: [ALL_VALUES_SELECTED] };
    case ENVIRONMENT_NOT_DEFINED.value:
    case undefined:
      return {};
    default:
      return { [SERVICE_ENVIRONMENT]: [environment] };
  }
}

export function AnalyzeDataButton() {
  const { agentName, serviceName } = useApmServiceContext();
  const { services } = useKibana();
  const { urlParams } = useUrlParams();
  const { rangeTo, rangeFrom, environment } = urlParams;
  const basepath = services.http?.basePath.get();

  if (isRumAgentName(agentName) || isIosAgentName(agentName)) {
    const href = createExploratoryViewUrl(
      {
        'apm-series': {
          dataType: isRumAgentName(agentName) ? 'ux' : 'mobile',
          time: { from: rangeFrom, to: rangeTo },
          reportType: 'kpi-over-time',
          reportDefinitions: {
            [SERVICE_NAME]: [serviceName],
            ...getEnvironmentDefinition(environment),
          },
          operationType: 'average',
          isNew: true,
        } as SeriesUrl,
      },
      basepath
    );

    return (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.apm.analyzeDataButton.tooltip', {
          defaultMessage:
            'EXPERIMENTAL - Analyze Data allows you to select and filter result data in any dimension, and look for the cause or impact of performance problems',
        })}
      >
        <EuiButtonEmpty href={href} iconType="visBarVerticalStacked">
          {i18n.translate('xpack.apm.analyzeDataButton.label', {
            defaultMessage: 'Analyze data',
          })}
        </EuiButtonEmpty>
      </EuiToolTip>
    );
  }

  return null;
}
