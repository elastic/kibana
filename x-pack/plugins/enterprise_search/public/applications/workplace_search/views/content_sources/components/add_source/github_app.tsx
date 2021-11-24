/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiPanel, EuiSpacer } from '@elastic/eui';

import { AppLogic } from '../../../../app_logic';
import {
  WorkplaceSearchPageTemplate,
  PersonalDashboardLayout,
} from '../../../../components/layout';
import { NAV, SOURCE_NAMES } from '../../../../constants';

import { staticSourceData } from '../../source_data';

import { AddSourceHeader } from './add_source_header';
import { SourceFeatures } from './source_features';

export const GitHubApp: React.FC = () => {
  const { isOrganization } = useValues(AppLogic);

  const name = SOURCE_NAMES.GITHUB;
  const data = staticSourceData.find((source) => (source.name = name));
  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;

  return (
    <Layout pageChrome={[NAV.SOURCES, NAV.ADD_SOURCE, name || '...']} isLoading={false}>
      <form onSubmit={() => 'TODO: use method from add_source_logic'}>
        <EuiFlexGroup
          direction="row"
          alignItems="flexStart"
          justifyContent="spaceBetween"
          gutterSize="xl"
          responsive={false}
        >
          <EuiFlexItem grow={1} className="adding-a-source__connect-an-instance">
            <EuiPanel paddingSize="none" hasShadow={false} color="subdued">
              <EuiPanel hasShadow={false} paddingSize="l" color="subdued">
                <AddSourceHeader
                  name={name}
                  serviceType="github"
                  categories={['Software', 'Version Control', 'Code Repository']} // TODO: get from API
                />
              </EuiPanel>
              <EuiHorizontalRule margin="xs" />
              <EuiPanel hasShadow={false} paddingSize="l" color="subdued">
                <SourceFeatures features={data!.features} name={name} objTypes={data!.objTypes} />
              </EuiPanel>
            </EuiPanel>
            <EuiSpacer />
            form goes here
          </EuiFlexItem>
        </EuiFlexGroup>
      </form>
    </Layout>
  );
};
