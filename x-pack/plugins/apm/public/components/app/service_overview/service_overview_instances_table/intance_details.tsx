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
  SERVICE_VERSION,
  SERVICE_NODE_NAME,
  SERVICE_RUNTIME_NAME,
  SERVICE_RUNTIME_VERSION,
  KUBERNETES_POD_NAME,
  KUBERNETES_POD_UID,
} from '../../../../../common/es_fields/apm';

import {
  KUBERNETES_CONTAINER_NAME,
  KUBERNETES_NAMESPACE,
  KUBERNETES_REPLICASET_NAME,
  KUBERNETES_DEPLOYMENT_NAME,
} from '../../../../../common/es_fields/infra_metrics';

import { isPending } from '../../../../hooks/use_fetcher';
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

function toKeyValuePairs({
  keys,
  data,
  isFilterable = true,
}: {
  keys: string[];
  data: ServiceInstanceDetails;
  isFilterable?: boolean;
}) {
  return keys.map((key) => ({
    key,
    value: get(data, key),
    isFilterable,
  }));
}

const serviceDetailsKeys = [
  SERVICE_NODE_NAME,
  SERVICE_VERSION,
  SERVICE_RUNTIME_NAME,
  SERVICE_RUNTIME_VERSION,
];
const containerDetailsKeys = [
  CONTAINER_ID,
  HOST_NAME,
  KUBERNETES_POD_UID,
  KUBERNETES_POD_NAME,
];
const metricsKubernetesDetailsKeys = [
  KUBERNETES_CONTAINER_NAME,
  KUBERNETES_NAMESPACE,
  KUBERNETES_REPLICASET_NAME,
  KUBERNETES_DEPLOYMENT_NAME,
];
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

  if (isPending(status)) {
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

  const serviceDetailsKeyValuePairs = toKeyValuePairs({
    keys: serviceDetailsKeys,
    data,
  });
  const containerDetailsKeyValuePairs = toKeyValuePairs({
    keys: containerDetailsKeys,
    data,
  });
  const metricsKubernetesKeyValuePairs = toKeyValuePairs({
    keys: metricsKubernetesDetailsKeys,
    data,
    isFilterable: false,
  });
  const cloudDetailsKeyValuePairs = toKeyValuePairs({
    keys: cloudDetailsKeys,
    data,
  });

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
          keyValueList={[
            ...containerDetailsKeyValuePairs,
            ...metricsKubernetesKeyValuePairs,
          ]}
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
