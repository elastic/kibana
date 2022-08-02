/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { fromQuery, toQuery } from '@kbn/observability-plugin/public';
import { useLegacyUrlParams } from '../../../../../context/url_params_context/use_url_params';

interface Props {
  serviceNames?: string[];
  loading: boolean;
}

function ServiceNameFilter({ loading, serviceNames }: Props) {
  const history = useHistory();
  const {
    urlParams: { serviceName: selectedServiceName },
  } = useLegacyUrlParams();

  const options = (serviceNames ?? []).map((type) => ({
    text: type,
    value: type,
  }));

  const updateServiceName = useCallback(
    (serviceN: string, replaceHistory?: boolean) => {
      const newLocation = {
        ...history.location,
        search: fromQuery({
          ...toQuery(history.location.search),
          serviceName: serviceN,
        }),
      };
      if (replaceHistory) {
        history.replace(newLocation);
      } else {
        history.push(newLocation);
      }
    },
    [history]
  );

  useEffect(() => {
    if (serviceNames && serviceNames?.length > 0) {
      // select first from the list
      if (!selectedServiceName) {
        updateServiceName(serviceNames[0], true);
      }

      // in case serviceName is cached from url and isn't present in current list
      if (selectedServiceName && !serviceNames.includes(selectedServiceName)) {
        updateServiceName(serviceNames[0], true);
      }
    }

    if (selectedServiceName && serviceNames?.length === 0 && !loading) {
      updateServiceName('');
    }
  }, [serviceNames, selectedServiceName, updateServiceName, loading]);

  return (
    <EuiSelect
      fullWidth
      prepend={i18n.translate('xpack.ux.localFilters.titles.webApplication', {
        defaultMessage: 'Web application',
      })}
      isLoading={loading}
      data-cy="serviceNameFilter"
      options={options}
      value={selectedServiceName}
      onChange={(event) => {
        updateServiceName(event.target.value);
      }}
    />
  );
}

export { ServiceNameFilter };
