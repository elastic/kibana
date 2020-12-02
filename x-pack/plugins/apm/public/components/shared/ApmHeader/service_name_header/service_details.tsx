/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { getAgentIcon } from '../../AgentIcon/get_agent_icon';
import { IconPopover } from './icon_popover';

export type ServiceDetailsApiResponse = APIReturnType<'GET /api/apm/services/{serviceName}'>;

interface Props {
  serviceDetails: ServiceDetailsApiResponse;
}

export function ServiceDetails({ serviceDetails }: Props) {
  if (!serviceDetails) {
    return null;
  }

  return (
    <IconPopover
      icon={getAgentIcon(serviceDetails.agent.name) || 'node'}
      title={i18n.translate('xpack.apm.serviceNameHeader.service', {
        defaultMessage: 'Service',
      })}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiStat
            title={serviceDetails.service.version}
            description={i18n.translate(
              'xpack.apm.serviceNameHeader.service.version',
              { defaultMessage: 'Service version' }
            )}
            titleSize="xxs"
          />
        </EuiFlexItem>
        {serviceDetails.service.runtime && (
          <EuiFlexItem>
            <EuiStat
              title={
                <>
                  {serviceDetails.service.runtime.name}{' '}
                  {serviceDetails.service.runtime.version}
                </>
              }
              description={i18n.translate(
                'xpack.apm.serviceNameHeader.service.runtime',
                { defaultMessage: 'Runtime name & version' }
              )}
              titleSize="xxs"
            />
          </EuiFlexItem>
        )}
        {serviceDetails.service.framework && (
          <EuiFlexItem>
            <EuiStat
              title={serviceDetails.service.framework.name}
              description={i18n.translate(
                'xpack.apm.serviceNameHeader.service.framework',
                { defaultMessage: 'Framework name' }
              )}
              titleSize="xxs"
            />
          </EuiFlexItem>
        )}
        {serviceDetails.agent && (
          <EuiFlexItem>
            <EuiStat
              title={
                <>
                  {serviceDetails.agent.name} {serviceDetails.agent.version}
                </>
              }
              description={i18n.translate(
                'xpack.apm.serviceNameHeader.service.agent',
                { defaultMessage: 'Agent name & version' }
              )}
              titleSize="xxs"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </IconPopover>
  );
}
