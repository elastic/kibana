/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Location } from 'history';
import { useActions, useValues } from 'kea';
import { Redirect, useLocation } from 'react-router-dom';

import { parseQueryParams } from '../../../../../applications/shared/query_params';

import { SOURCES_PATH, getSourcesPath } from '../../../routes';

import { AppLogic } from '../../../app_logic';
import { SourcesLogic } from '../sources_logic';

interface SourceQueryParams {
  name: string;
  hasError: boolean;
  errorMessages?: string[];
  serviceType: string;
  indexPermissions: boolean;
}

export const SourceAdded: React.FC = () => {
  const { search } = useLocation() as Location;
  const { name, hasError, errorMessages, serviceType, indexPermissions } = (parseQueryParams(
    search
  ) as unknown) as SourceQueryParams;
  const { setAddedSource, setFlashMessages } = useActions(SourcesLogic);
  const { isOrganization } = useValues(AppLogic);
  const decodedName = decodeURIComponent(name);

  if (hasError) {
    const defaultError = [`${decodedName} failed to connect.`];
    setFlashMessages({ error: errorMessages || defaultError });
  } else {
    setAddedSource(decodedName, indexPermissions, serviceType);
  }

  return <Redirect to={getSourcesPath(SOURCES_PATH, isOrganization)} />;
};
