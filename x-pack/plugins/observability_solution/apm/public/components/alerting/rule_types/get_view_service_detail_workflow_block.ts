/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnWidgetAdd, WorkflowBlock } from '@kbn/investigate-plugin/public';
import { i18n } from '@kbn/i18n';
import type { TopAlert } from '@kbn/observability-plugin/public';
import type { Environment } from '../../../../common/environment_rt';
import { createInvestigateServiceDetailWidget } from '../../../investigate/investigate_service_detail/create_investigate_service_detail_widget';
import { SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../common/es_fields/apm';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';

export function getViewServiceDetailWorkflowBlock({
  alert,
  onWidgetAdd,
}: {
  alert: TopAlert<Record<string, any>>;
  onWidgetAdd: OnWidgetAdd;
}): WorkflowBlock {
  return {
    id: 'view_service_detail',
    loading: false,
    content: i18n.translate('xpack.apm.alertTypes.viewServiceDetailWorkflowBlockTitle', {
      defaultMessage: 'View service',
    }),
    onClick: () => {
      const serviceName: string = alert.fields[SERVICE_NAME];
      const environment: Environment = alert.fields[SERVICE_ENVIRONMENT]
        ? alert.fields[SERVICE_ENVIRONMENT]
        : ENVIRONMENT_ALL.value;

      onWidgetAdd(
        createInvestigateServiceDetailWidget({
          title: serviceName,
          parameters: {
            serviceName,
            environment,
          },
        })
      );
    },
  };
}
