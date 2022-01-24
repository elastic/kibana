/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  CLOUD_AVAILABILITY_ZONE,
  CLOUD_INSTANCE_ID,
  CLOUD_INSTANCE_NAME,
  CLOUD_MACHINE_TYPE,
  CLOUD_PROVIDER,
  CONTAINER_ID,
  HOST_NAME,
  POD_NAME,
  SERVICE_NODE_NAME,
  SERVICE_RUNTIME_NAME,
  SERVICE_RUNTIME_VERSION,
  SERVICE_VERSION,
} from '../../../../../common/elasticsearch_fieldnames';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { getAgentIcon } from '../../../shared/agent_icon/get_agent_icon';
import { KeyValueFilterList } from '../../../shared/key_value_filter_list';
import { pushNewItemToKueryBar } from '../../../shared/kuery_bar/utils';
import { getCloudIcon, getContainerIcon } from '../../../shared/service_icons';
import { useInstanceDetailsFetcher } from './use_instance_details_fetcher';

type ServiceInstanceDetails =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}'>;

interface Props {
  serviceName: string;
  serviceNodeName: string;
  kuery: string;
}

function toKeyValuePairs(keys: string[], data: ServiceInstanceDetails) {
  return keys.map((key) => ({ key, value: get(data, key) }));
}

const serviceDetailsKeys = [
  SERVICE_NODE_NAME,
  SERVICE_VERSION,
  SERVICE_RUNTIME_NAME,
  SERVICE_RUNTIME_VERSION,
];
const containerDetailsKeys = [CONTAINER_ID, HOST_NAME, POD_NAME];
const cloudDetailsKeys = [
  CLOUD_AVAILABILITY_ZONE,
  CLOUD_INSTANCE_ID,
  CLOUD_INSTANCE_NAME,
  CLOUD_MACHINE_TYPE,
  CLOUD_PROVIDER,
];

export function InstanceDetails({
  serviceName,
  serviceNodeName,
  kuery,
}: Props) {
  const theme = useTheme();
  const history = useHistory();

  const { data, status } = useInstanceDetailsFetcher({
    serviceName,
    serviceNodeName,
  });

  if (
    status === FETCH_STATUS.LOADING ||
    status === FETCH_STATUS.NOT_INITIATED
  ) {
    return (
      <div style={{ width: '50%' }}>
        <EuiLoadingContent data-test-subj="loadingSpinner" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const addKueryBarFilter = ({ key, value }: { key: string; value: any }) => {
    pushNewItemToKueryBar({ kuery, history, key, value });
  };

  const serviceDetailsKeyValuePairs = toKeyValuePairs(serviceDetailsKeys, data);
  const containerDetailsKeyValuePairs = toKeyValuePairs(
    containerDetailsKeys,
    data
  );
  const cloudDetailsKeyValuePairs = toKeyValuePairs(cloudDetailsKeys, data);

  const containerType = data.kubernetes?.pod?.name ? 'Kubernetes' : 'Docker';
  return (
    <EuiFlexGroup direction="column" responsive={false}>
      <EuiFlexItem>
        <KeyValueFilterList
          initialIsOpen
          title={i18n.translate(
            'xpack.apm.serviceOverview.instanceTable.details.serviceTitle',
            { defaultMessage: 'Service' }
          )}
          icon={getAgentIcon(data.agent?.name, theme.darkMode)}
          keyValueList={serviceDetailsKeyValuePairs}
          onClickFilter={addKueryBarFilter}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <KeyValueFilterList
          title={i18n.translate(
            'xpack.apm.serviceOverview.instanceTable.details.containerTitle',
            { defaultMessage: 'Container' }
          )}
          icon={getContainerIcon(containerType)}
          keyValueList={containerDetailsKeyValuePairs}
          onClickFilter={addKueryBarFilter}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <KeyValueFilterList
          title={i18n.translate(
            'xpack.apm.serviceOverview.instanceTable.details.cloudTitle',
            { defaultMessage: 'Cloud' }
          )}
          icon={getCloudIcon(data.cloud?.provider)}
          keyValueList={cloudDetailsKeyValuePairs}
          onClickFilter={addKueryBarFilter}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
