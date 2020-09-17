/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiHorizontalRule,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { fromQuery, toQuery } from '../../Links/url_helpers';

interface Props {
  serviceNames: string[];
  loading: boolean;
}

function ServiceNameFilter({ loading, serviceNames }: Props) {
  const history = useHistory();
  const {
    urlParams: { serviceName: selectedServiceName },
  } = useUrlParams();

  const options = serviceNames.map((type) => ({
    text: type,
    value: type,
  }));

  const updateServiceName = useCallback(
    (serviceN: string) => {
      const newLocation = {
        ...history.location,
        search: fromQuery({
          ...toQuery(history.location.search),
          serviceName: serviceN,
        }),
      };
      history.push(newLocation);
    },
    [history]
  );

  useEffect(() => {
    if (serviceNames?.length > 0) {
      // select first from the list
      if (!selectedServiceName) {
        updateServiceName(serviceNames[0]);
      }

      // in case serviceName is cached from url and isn't present in current list
      if (selectedServiceName && !serviceNames.includes(selectedServiceName)) {
        updateServiceName(serviceNames[0]);
      }
    }

    if (selectedServiceName && serviceNames.length === 0 && !loading) {
      updateServiceName('');
    }
  }, [serviceNames, selectedServiceName, updateServiceName, loading]);

  return (
    <>
      <EuiTitle size="xxxs" textTransform="uppercase">
        <h4>
          {i18n.translate('xpack.apm.localFilters.titles.serviceName', {
            defaultMessage: 'Service name',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="s" />
      <EuiSelect
        isLoading={loading}
        data-cy="serviceNameFilter"
        options={options}
        value={selectedServiceName}
        compressed={true}
        onChange={(event) => {
          updateServiceName(event.target.value);
        }}
      />
    </>
  );
}

export { ServiceNameFilter };
