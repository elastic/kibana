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

import { staticGenericExternalSourceData } from '../../source_data';

import { AddSourceHeader } from './add_source_header';
import { ConfigurationIntro } from './configuration_intro';

import './add_source.scss';

export const AddSourceBYOIntro: React.FC = () => {
  const { name, categories = [], serviceType } = staticGenericExternalSourceData;
  const { isOrganization } = useValues(AppLogic);

  const header = <AddSourceHeader name={name} serviceType={serviceType} categories={categories} />;
  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;
  const to = `${getSourcesPath(getAddPath(serviceType), isOrganization)}/connector_registration`;
  return (
    <Layout pageChrome={[NAV.SOURCES, NAV.ADD_SOURCE, name]}>
      <ConfigurationIntro name={name} advanceStepTo={to} header={header} />
    </Layout>
  );
};
