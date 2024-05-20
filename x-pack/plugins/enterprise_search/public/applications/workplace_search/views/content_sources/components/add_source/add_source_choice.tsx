/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useParams } from 'react-router-dom';

import { useValues } from 'kea';

import { KibanaLogic } from '../../../../../shared/kibana';
import { LicensingLogic } from '../../../../../shared/licensing';

import { AppLogic } from '../../../../app_logic';
import {
  WorkplaceSearchPageTemplate,
  PersonalDashboardLayout,
} from '../../../../components/layout';
import { NAV } from '../../../../constants';

import { getSourcesPath, ADD_SOURCE_PATH } from '../../../../routes';

import { getSourceData } from '../../source_data';

import { ConfigurationChoice } from './configuration_choice';

import './add_source.scss';

export const AddSourceChoice: React.FC = () => {
  const { serviceType } = useParams<{ serviceType: string }>();
  const sourceData = getSourceData(serviceType);

  const { isOrganization } = useValues(AppLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { navigateToUrl } = useValues(KibanaLogic);

  if (!sourceData) {
    return null;
  }

  const { name, accountContextOnly } = sourceData;

  if (!hasPlatinumLicense && accountContextOnly) {
    navigateToUrl(getSourcesPath(ADD_SOURCE_PATH, isOrganization));
  }

  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;

  return (
    <Layout pageChrome={[NAV.SOURCES, NAV.ADD_SOURCE, name]}>
      <ConfigurationChoice sourceData={sourceData} />
    </Layout>
  );
};
