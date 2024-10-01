/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSkeletonText } from '@elastic/eui';
import { CloudProvider, getAgentIcon, getCloudProviderIcon } from '@kbn/custom-icons';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { isPending } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { KeyValueFilterList } from '../../../shared/key_value_filter_list';
import { pushNewItemToKueryBar } from '../../../shared/kuery_bar/utils';
import { getContainerIcon } from '../../../shared/service_icons';
import { useInstanceDetailsFetcher } from './use_instance_details_fetcher';
import {
  SERVICE_METADATA_CLOUD_KEYS,
  SERVICE_METADATA_CONTAINER_KEYS,
  SERVICE_METADATA_INFRA_METRICS_KEYS,
  SERVICE_METADATA_SERVICE_KEYS,
} from '../../../../../common/service_metadata';

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

export function InstanceDetails({ serviceName, serviceNodeName, kuery }: Props) {
  const theme = useTheme();
  const history = useHistory();

  const { data, status } = useInstanceDetailsFetcher({
    serviceName,
    serviceNodeName,
  });

  if (isPending(status)) {
    return (
      <div style={{ width: '50%' }}>
        <EuiSkeletonText data-test-subj="loadingSpinner" />
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
    keys: SERVICE_METADATA_SERVICE_KEYS,
    data,
  });
  const containerDetailsKeyValuePairs = toKeyValuePairs({
    keys: SERVICE_METADATA_CONTAINER_KEYS,
    data,
  });
  const metricsKubernetesKeyValuePairs = toKeyValuePairs({
    keys: SERVICE_METADATA_INFRA_METRICS_KEYS,
    data,
    isFilterable: false,
  });

  const cloudDetailsKeyValuePairs = toKeyValuePairs({
    keys: SERVICE_METADATA_CLOUD_KEYS,
    data,
  });

  const containerType = data.kubernetes?.pod?.name ? 'Kubernetes' : 'Docker';
  return (
    <EuiFlexGroup direction="column" responsive={false}>
      <EuiFlexItem>
        <KeyValueFilterList
          initialIsOpen
          title={i18n.translate('xpack.apm.serviceOverview.instanceTable.details.serviceTitle', {
            defaultMessage: 'Service',
          })}
          icon={getAgentIcon(data.agent?.name, theme.darkMode)}
          keyValueList={serviceDetailsKeyValuePairs}
          onClickFilter={addKueryBarFilter}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <KeyValueFilterList
          title={i18n.translate('xpack.apm.serviceOverview.instanceTable.details.containerTitle', {
            defaultMessage: 'Container',
          })}
          icon={getContainerIcon(containerType)}
          keyValueList={[...containerDetailsKeyValuePairs, ...metricsKubernetesKeyValuePairs]}
          onClickFilter={addKueryBarFilter}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <KeyValueFilterList
          title={i18n.translate('xpack.apm.serviceOverview.instanceTable.details.cloudTitle', {
            defaultMessage: 'Cloud',
          })}
          icon={getCloudProviderIcon(data.cloud?.provider as CloudProvider)}
          keyValueList={cloudDetailsKeyValuePairs}
          onClickFilter={addKueryBarFilter}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
