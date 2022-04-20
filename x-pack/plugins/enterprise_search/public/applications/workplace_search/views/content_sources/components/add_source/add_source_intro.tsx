/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

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
  const { name, categories, serviceType, baseServiceType } = props.sourceData;
  const { isOrganization } = useValues(AppLogic);

  const header = (
    <AddSourceHeader
      name={name}
      serviceType={baseServiceType || serviceType}
      categories={categories || []}
    />
  );
  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;
  const to =
    `${getSourcesPath(getAddPath(serviceType, baseServiceType), isOrganization)}/` +
    (hasMultipleConnectorOptions(props.sourceData.serviceType)
      ? '/choice'
      : serviceType === 'external'
      ? '/connector_config'
      : '/');
  return (
    <Layout pageChrome={[NAV.SOURCES, NAV.ADD_SOURCE, name || '...']}>
      <ConfigurationIntro name={name} advanceStepTo={to} header={header} />
    </Layout>
  );
};
