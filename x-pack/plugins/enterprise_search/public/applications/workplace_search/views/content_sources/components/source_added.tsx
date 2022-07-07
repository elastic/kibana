/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { Location } from 'history';
import { useActions, useValues } from 'kea';

import { EuiPage, EuiPageBody } from '@elastic/eui';

import { KibanaLogic } from '../../../../shared/kibana';
import { Loading } from '../../../../shared/loading';
import { parseQueryParams } from '../../../../shared/query_params';

import { AddSourceLogic, OauthParams } from './add_source/add_source_logic';

/**
 * This component merely triggers catchs the redirect from the oauth application and initializes the saving
 * of the params the oauth plugin sends back. The logic file now redirects back to sources with either a
 * success or error message upon completion.
 */
export const SourceAdded: React.FC = () => {
  const { search } = useLocation() as Location;
  const params = parseQueryParams(search) as unknown as OauthParams;
  const state = JSON.parse(params.state);
  const isOrganization = state.context !== 'account';
  const { setChromeIsVisible } = useValues(KibanaLogic);
  const addSourceLogic = AddSourceLogic({
    serviceType: state.service_type,
    initialStep: 'configure',
  });
  const { saveSourceParams } = useActions(addSourceLogic);

  // We don't want the personal dashboard to flash the Kibana chrome, so we hide it.
  setChromeIsVisible(isOrganization);

  useEffect(() => {
    saveSourceParams(search, params, isOrganization);
  }, []);

  return (
    <EuiPage>
      <EuiPageBody>
        <Loading />
      </EuiPageBody>
    </EuiPage>
  );
};
