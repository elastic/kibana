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
  container: ServiceDetailsApiResponse['container'];
}

export function ContainerDetails({ container }: Props) {
  if (!container) {
    return null;
  }

  return (
    <IconPopover
      icon={
        container.orchestration === 'Kubernetes'
          ? 'logoKubernetes'
          : 'logoDocker'
      }
      title={i18n.translate('xpack.apm.serviceNameHeader.container', {
        defaultMessage: 'Container',
      })}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        {container.os && (
          <EuiFlexItem>
            <EuiStat
              title={container.os}
              description={i18n.translate(
                'xpack.apm.serviceNameHeader.container.os',
                { defaultMessage: 'OS' }
              )}
              titleSize="xxs"
            />
          </EuiFlexItem>
        )}
        {container.isContainerized !== undefined && (
          <EuiFlexItem>
            <EuiStat
              title={
                container.isContainerized
                  ? i18n.translate(
                      'xpack.apm.serviceNameHeader.container.yes',
                      { defaultMessage: 'Yes' }
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

        {container.avgNumberInstances && (
          <EuiFlexItem>
            <EuiStat
              title={Math.round(container.avgNumberInstances)}
              description={i18n.translate(
                'xpack.apm.serviceNameHeader.container.avgNumberInstances',
                { defaultMessage: 'Avg. number of instances' }
              )}
              titleSize="xxs"
            />
          </EuiFlexItem>
        )}

        {container.orchestration && (
          <EuiStat
            title={container.orchestration}
            description={i18n.translate(
              'xpack.apm.serviceNameHeader.container.orchestration',
              { defaultMessage: 'Orchestration' }
            )}
            titleSize="xxs"
          />
        )}
      </EuiFlexGroup>
    </IconPopover>
  );
}
