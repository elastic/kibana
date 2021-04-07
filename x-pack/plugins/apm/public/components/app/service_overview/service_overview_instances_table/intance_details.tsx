/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { isEmpty } from 'lodash';
import { useHistory } from 'react-router-dom';
import { pct } from '../../../../style/variables';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';
import { getAgentIcon } from '../../../shared/AgentIcon/get_agent_icon';
import {
  getCloudIcon,
  getContainerIcon,
} from '../../service_details/service_icons';
import { KeyValueFilterList } from '../../../shared/key_value_filter_list';
import { push } from '../../../shared/Links/url_helpers';

interface Props {
  serviceName: string;
  serviceNodeName: string;
}

export function InstanceDetails({ serviceName, serviceNodeName }: Props) {
  const theme = useTheme();
  const history = useHistory();
  const {
    urlParams: { start, end, kuery, environment },
  } = useUrlParams();
  const { transactionType } = useApmServiceContext();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end || !transactionType) {
        return;
      }
      return callApmApi({
        endpoint:
          'GET /api/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}',
        params: {
          path: {
            serviceName,
            serviceNodeName,
          },
          query: { start, end, transactionType, environment, kuery },
        },
      });
    },
    [
      serviceName,
      serviceNodeName,
      start,
      end,
      transactionType,
      environment,
      kuery,
    ]
  );

  if (
    status === FETCH_STATUS.LOADING ||
    status === FETCH_STATUS.NOT_INITIATED
  ) {
    return (
      <div style={{ width: pct(50) }}>
        <EuiLoadingContent />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const addKueryBarFilter = ({ key, value }: { key: string; value: any }) => {
    const newKueryOption = `${key} :"${value}"`;
    const nextKueryFilter = isEmpty(kuery)
      ? newKueryOption
      : `${kuery} and ${newKueryOption}`;

    push(history, {
      query: { kuery: encodeURIComponent(nextKueryFilter) },
    });
  };

  return (
    <EuiFlexGroup direction="column" responsive={false}>
      <EuiFlexItem>
        <KeyValueFilterList
          initialIsOpen
          title={i18n.translate(
            'xpack.apm.serviceOverview.instanceTable.details.serviceTitle',
            { defaultMessage: 'Service' }
          )}
          icon={getAgentIcon(data.service.icon, theme.darkMode)}
          keyValueList={data.service.details}
          onClickFilter={addKueryBarFilter}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <KeyValueFilterList
          title={i18n.translate(
            'xpack.apm.serviceOverview.instanceTable.details.containerTitle',
            { defaultMessage: 'Container' }
          )}
          icon={getContainerIcon(data.container.icon)}
          keyValueList={data.container.details}
          onClickFilter={addKueryBarFilter}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <KeyValueFilterList
          title={i18n.translate(
            'xpack.apm.serviceOverview.instanceTable.details.cloudTitle',
            { defaultMessage: 'Cloud' }
          )}
          icon={getCloudIcon(data.cloud.icon)}
          keyValueList={data.cloud.details}
          onClickFilter={addKueryBarFilter}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
