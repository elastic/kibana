/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { KibanaLogic } from '../../../../../shared/kibana';
import { AppLogic } from '../../../../app_logic';
import {
  WorkplaceSearchPageTemplate,
  PersonalDashboardLayout,
} from '../../../../components/layout';
import { NAV } from '../../../../constants';
import { getSourcesPath, getAddPath } from '../../../../routes';

import { SourceDataItem } from '../../../../types';

import { hasMultipleConnectorOptions } from '../../source_data';

import { AddSourceHeader } from './add_source_header';
import { ConfigurationIntro } from './configuration_intro';

import './add_source.scss';

interface AddSourceIntroProps {
  sourceData: SourceDataItem;
}

export const AddSourceIntro: React.FC<AddSourceIntroProps> = (props) => {
  const { name, categories, serviceType } = props.sourceData;
  const { isOrganization } = useValues(AppLogic);

  const goToChoice = () =>
    KibanaLogic.values.navigateToUrl(
      `${getSourcesPath(
        `${getSourcesPath(getAddPath(serviceType), isOrganization)}/`,
        isOrganization
      )}/`
    );

  const goToInternal = () =>
    KibanaLogic.values.navigateToUrl(
      `${getSourcesPath(
        `${getSourcesPath(getAddPath(serviceType), isOrganization)}/`,
        isOrganization
      )}/`
    );

  const header = (
    <AddSourceHeader name={name} serviceType={serviceType} categories={categories || []} />
  );
  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;

  return (
    <Layout pageChrome={[NAV.SOURCES, NAV.ADD_SOURCE, name || '...']}>
      <ConfigurationIntro
        name={name}
        advanceStep={
          hasMultipleConnectorOptions(props.sourceData.serviceType) ? goToChoice : goToInternal
        }
        header={header}
      />
    </Layout>
  );
};
