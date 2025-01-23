/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Redirect } from 'react-router-dom';
import styled from '@emotion/styled';
import { useApmParams } from '../../../hooks/use_apm_params';
import { getRedirectToErrorGroupPageUrl } from '../trace_link/get_redirect_to_error_group_page_url';
import type { ApmPluginStartDeps } from '../../../plugin';
import { useKibana } from '../../../context/kibana_context/use_kibana';

const CentralizedContainer = styled.div`
  height: 100%;
  display: flex;
`;

export function ErrorGroupLink() {
  const { services } = useKibana<ApmPluginStartDeps>();
  const { data: dataService } = services;
  const timeRange = dataService.query.timefilter.timefilter.getTime();

  const {
    path: { errorGroupId },
    query: { rangeFrom = timeRange.from, rangeTo = timeRange.to, serviceName, kuery },
  } = useApmParams('/link-to/error_group/{errorGroupId}');

  if (errorGroupId) {
    return (
      <Redirect
        to={getRedirectToErrorGroupPageUrl({
          errorGroupId,
          rangeFrom,
          rangeTo,
          serviceName: serviceName ?? '', // TODO make sure this is always defined, maybe querying from the errorGroupId
          kuery,
        })}
      />
    );
  }

  return (
    <CentralizedContainer>
      <EuiEmptyPrompt
        iconType="apmTrace"
        title={
          <h2>
            {i18n.translate('xpack.apm.errorGroupLink.h2.fetchingErrorGroupLabel', {
              defaultMessage: 'Fetching error group',
            })}
          </h2>
        }
      />
    </CentralizedContainer>
  );
}
