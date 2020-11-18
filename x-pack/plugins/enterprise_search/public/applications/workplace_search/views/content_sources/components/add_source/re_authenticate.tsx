/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import { Location } from 'history';
import { useActions, useValues } from 'kea';
import { useLocation } from 'react-router-dom';

import { parseQueryParams } from 'app_search/utils/queryParams';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';

import { SourceLogic } from 'workplace_search/ContentSources/SourceLogic';

interface SourceQueryParams {
  sourceId: string;
}

interface ReAuthenticateProps {
  name: string;
  header: React.ReactNode;
}

export const ReAuthenticate: React.FC<ReAuthenticateProps> = ({ name, header }) => {
  const { search } = useLocation() as Location;

  const { sourceId } = (parseQueryParams(search) as unknown) as SourceQueryParams;
  const [formLoading, setFormLoading] = useState(false);

  const { getSourceReConnectData } = useActions(SourceLogic);
  const {
    sourceConnectData: { oauthUrl },
  } = useValues(SourceLogic);

  useEffect(() => {
    getSourceReConnectData(sourceId);
  }, []);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setFormLoading(true);
    window.location.href = oauthUrl;
  };

  return (
    <div className="step-4">
      {header}
      <form onSubmit={handleFormSubmit}>
        <EuiFlexGroup
          direction="row"
          alignItems="flexStart"
          justifyContent="spaceBetween"
          gutterSize="xl"
          responsive={false}
        >
          <EuiFlexItem grow={1} className="adding-a-source__connect-an-instance">
            <p>
              Your {name} credentials are no longer valid. Please re-authenticate with the original
              credentials to resume content syncing.
            </p>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiFormRow>
          <EuiButton color="primary" fill type="submit" isLoading={!oauthUrl || formLoading}>
            Re-authenticate {name}
          </EuiButton>
        </EuiFormRow>
      </form>
    </div>
  );
};
