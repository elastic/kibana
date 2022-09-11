/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues } from 'kea';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormFieldset,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { Status } from '../../../../../../common/types/api';
import { FetchIndexApiLogic } from '../../../api/index/fetch_index_api_logic';
import { EnterpriseSearchContentPageTemplate } from '../../layout';
import { baseBreadcrumbs } from '../../search_indices';
import { IndexNameLogic } from '../index_name_logic';

import { ConnectorCheckable } from './connector_checkable';

interface NativeConnector {
  name: string;
  serviceType: string;
}

const NATIVE_CONNECTORS: NativeConnector[] = [
  {
    name: 'MongoDB',
    serviceType: 'mongodb',
  },
  {
    name: 'MySQL',
    serviceType: 'mysql',
  },
];
export const SelectConnector: React.FC = () => {
  const { data: indexData, status: indexApiStatus } = useValues(FetchIndexApiLogic);

  const { indexName } = useValues(IndexNameLogic);

  const [selectedConnector, selectConnector] = useState<NativeConnector | undefined>();

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[...baseBreadcrumbs, indexName]}
      pageViewTelemetry="select_connector"
      isLoading={
        indexApiStatus === Status.IDLE ||
        (typeof indexData === 'undefined' && indexApiStatus === Status.LOADING)
      }
      pageHeader={{
        pageTitle: indexName,
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          console.log(`User selected connector ${selectedConnector?.name}`);
        }}
      >
        <EuiFormFieldset
          legend={{
            children: (
              <>
                <EuiTitle size="s">
                  <span>Select a connector</span>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText color="subdued" size="s">
                  <p>
                    Get started by selecting the connector you’d like to configure to extract, index
                    and sync data from your data source into your newly created search index.
                  </p>
                </EuiText>
              </>
            ),
          }}
        >
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="row">
            {NATIVE_CONNECTORS.map((nativeConnector) => (
              <EuiFlexItem>
                <ConnectorCheckable
                  {...nativeConnector}
                  onChange={() => selectConnector(nativeConnector)}
                  documentationUrl={'' /* TODO docsUrl */}
                  checked={selectedConnector === nativeConnector}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiButton fill color="primary" type="submit" disabled={selectedConnector === undefined}>
            Select and configure
          </EuiButton>
          <EuiSpacer />
          <EuiText size="s">
            Looking for more connectors?{' '}
            <EuiLink target="_blank">View additional integrations in Workplace Search</EuiLink>
            {' or '}
            <EuiLink target="_blank">build your own</EuiLink>.
          </EuiText>
        </EuiFormFieldset>
      </form>
    </EnterpriseSearchContentPageTemplate>
  );
};
