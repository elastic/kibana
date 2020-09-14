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
    urlParams: { serviceName },
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
    if (!serviceName && serviceNames.length > 0) {
      updateServiceName(serviceNames[0]);
    }
  }, [serviceNames, serviceName, updateServiceName]);

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
        value={serviceName}
        compressed={true}
        onChange={(event) => {
          updateServiceName(event.target.value);
        }}
      />
    </>
  );
}

export { ServiceNameFilter };
