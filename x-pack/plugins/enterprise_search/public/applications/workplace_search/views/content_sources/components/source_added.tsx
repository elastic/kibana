/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { Location } from 'history';
import { useActions } from 'kea';
import { useLocation } from 'react-router-dom';

import { parseQueryParams } from '../../../../shared/query_params';
import { Loading } from '../../../../shared/loading';

import { AddSourceLogic, OauthParams } from './add_source/add_source_logic';

/**
 * This component merely triggers catchs the redirect from the oauth application and initializes the saving
 * of the params the oauth plugin sends back. The logic file now redirects back to sources with either a
 * success or error message upon completion.
 */
export const SourceAdded: React.FC = () => {
  const { search } = useLocation() as Location;
  const params = (parseQueryParams(search) as unknown) as OauthParams;
  const { saveSourceParams } = useActions(AddSourceLogic);

  useEffect(() => {
    saveSourceParams(params);
  }, []);

  return <Loading />;
};
