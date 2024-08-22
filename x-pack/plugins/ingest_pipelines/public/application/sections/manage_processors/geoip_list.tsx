/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiPageTemplate } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { SectionLoading, useKibana } from '../../../shared_imports';
import { getErrorMessage } from './get_error_message';
import { GeoipTable } from './geoip_table';

export const GeoipList: React.FunctionComponent = () => {
  const { services } = useKibana();
  const { data, isLoading, error, resendRequest } = services.api.useLoadGeoipDatabases();
  if (error) {
    return (
      <EuiPageTemplate.EmptyPrompt
        color="danger"
        iconType="warning"
        title={
          <h2 data-test-subj="geoipListLoadingError">
            <FormattedMessage
              id="xpack.ingestPipelines.manageProcessors.geoip.list.loadErrorTitle"
              defaultMessage="Unable to load geoIP databases"
            />
          </h2>
        }
        body={<p>{getErrorMessage(error)}</p>}
        actions={
          <EuiButton onClick={resendRequest} iconType="refresh" color="danger">
            <FormattedMessage
              id="xpack.ingestPipelines.manageProcessors.geoip.list.geoipListReloadButton"
              defaultMessage="Try again"
            />
          </EuiButton>
        }
      />
    );
  }

  if (isLoading && !data) {
    return (
      <SectionLoading data-test-subj="sectionLoading">
        <FormattedMessage
          id="xpack.ingestPipelines.manageProcessors.geoip.list.loadingMessage"
          defaultMessage="Loading geoIP databases..."
        />
      </SectionLoading>
    );
  }

  if (data && data.length === 0) {
    // TODO empty list for geoip databases
    return null;
  }
  return <GeoipTable items={data!} reloadDatabases={resendRequest} />;
};
