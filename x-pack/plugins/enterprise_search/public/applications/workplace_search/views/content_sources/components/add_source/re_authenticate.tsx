/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, FormEvent } from 'react';
import { useLocation } from 'react-router-dom';

import { Location } from 'history';
import { useActions, useValues } from 'kea';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { parseQueryParams } from '../../../../../../applications/shared/query_params';

import { AddSourceLogic } from './add_source_logic';

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

  const { getSourceReConnectData } = useActions(AddSourceLogic);
  const {
    sourceConnectData: { oauthUrl },
  } = useValues(AddSourceLogic);

  useEffect(() => {
    getSourceReConnectData(sourceId);
  }, []);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    window.location.replace(oauthUrl);
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
              {i18n.translate(
                'xpack.enterpriseSearch.workplaceSearch.contentSource.reAuthenticate.body',
                {
                  defaultMessage:
                    'Your {name} credentials are no longer valid. Please re-authenticate with the original credentials to resume content syncing.',
                  values: { name },
                }
              )}
            </p>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiFormRow>
          <EuiButton color="primary" fill type="submit" isLoading={!oauthUrl || formLoading}>
            {i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.contentSource.reAuthenticate.button',
              {
                defaultMessage: 'Re-authenticate {name}',
                values: { name },
              }
            )}
          </EuiButton>
        </EuiFormRow>
      </form>
    </div>
  );
};
