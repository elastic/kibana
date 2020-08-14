/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { useLoadPoliciesList } from '../../services/api';

import { EditPolicy as PresentationComponent } from './edit_policy';

interface RouterProps {
  policyName: string;
}

interface Props {
  getUrlForApp: (
    appId: string,
    options?: {
      path?: string;
      absolute?: boolean;
    }
  ) => string;
}

export const EditPolicy: React.FunctionComponent<Props & RouteComponentProps<RouterProps>> = ({
  match: {
    params: { policyName },
  },
  getUrlForApp,
  history,
}) => {
  const { error, isLoading, data: policies } = useLoadPoliciesList(true);
  if (isLoading) {
    return <p>...loading</p>;
  }
  if (error || !policies) {
    return <p>error</p>;
  }

  return (
    <PresentationComponent
      policies={policies}
      history={history}
      getUrlForApp={getUrlForApp}
      policyName={policyName}
    />
  );
};
