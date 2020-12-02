/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { IconPopover } from './icon_popover';

export type ServiceDetailsApiResponse = APIReturnType<'GET /api/apm/services/{serviceName}'>;

interface Props {
  serviceDetails: ServiceDetailsApiResponse;
}

export function ContainerDetails({ serviceDetails }: Props) {
  if (
    !serviceDetails ||
    (!serviceDetails.container && !serviceDetails.kubernetes)
  ) {
    return null;
  }

  const isKubernetes = !!serviceDetails.kubernetes;

  return (
    <IconPopover
      icon={isKubernetes ? 'logoKubernetes' : 'logoDocker'}
      title={i18n.translate('xpack.apm.serviceNameHeader.container', {
        defaultMessage: 'Container',
      })}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        {serviceDetails.host?.os?.platform && (
          <EuiFlexItem>
            <EuiStat
              title={serviceDetails.host.os?.platform}
              description={i18n.translate(
                'xpack.apm.serviceNameHeader.container.os',
                { defaultMessage: 'OS' }
              )}
              titleSize="xxs"
            />
          </EuiFlexItem>
        )}
        {serviceDetails.container?.id && (
          <EuiFlexItem>
            <EuiStat
              title={
                serviceDetails.container?.id
                  ? i18n.translate(
                      'xpack.apm.serviceNameHeader.container.yes',
                      {
                        defaultMessage: 'Yes',
                      }
                    )
                  : i18n.translate('xpack.apm.serviceNameHeader.container.no', {
                      defaultMessage: 'No',
                    })
              }
              description={i18n.translate(
                'xpack.apm.serviceNameHeader.container.containerized',
                { defaultMessage: 'Containerized' }
              )}
              titleSize="xxs"
            />
          </EuiFlexItem>
        )}

        {serviceDetails.container?.avgNumberInstances && (
          <EuiFlexItem>
            <EuiStat
              title={serviceDetails.container?.avgNumberInstances}
              description={i18n.translate(
                'xpack.apm.serviceNameHeader.container.avgNumberInstances',
                { defaultMessage: 'Avg. number of instances' }
              )}
              titleSize="xxs"
            />
          </EuiFlexItem>
        )}
        <EuiStat
          title={
            isKubernetes
              ? i18n.translate(
                  'xpack.apm.serviceNameHeader.container.orchestration.kubernetes',
                  { defaultMessage: 'Kubernetes' }
                )
              : i18n.translate(
                  'xpack.apm.serviceNameHeader.container.orchestration.docker',
                  { defaultMessage: 'Docker' }
                )
          }
          description={i18n.translate(
            'xpack.apm.serviceNameHeader.container.orchestration',
            { defaultMessage: 'Orchestration' }
          )}
          titleSize="xxs"
        />
      </EuiFlexGroup>
    </IconPopover>
  );
}
