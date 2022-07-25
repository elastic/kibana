/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useParams } from 'react-router-dom';

import { useValues } from 'kea';

import { AppLogic } from '../../../../../app_logic';
import {
  WorkplaceSearchPageTemplate,
  PersonalDashboardLayout,
} from '../../../../../components/layout';
import { NAV } from '../../../../../constants';

import { getSourceData } from '../../../source_data';

import { AddCustomSourceLogic, AddCustomSourceSteps } from './add_custom_source_logic';
import { ConfigureCustom } from './configure_custom';
import { SaveCustom } from './save_custom';

export const AddCustomSource: React.FC = () => {
  const { baseServiceType } = useParams<{ baseServiceType?: string }>();
  const sourceData = getSourceData('custom', baseServiceType);

  const addCustomSourceLogic = AddCustomSourceLogic({
    baseServiceType,
    initialValue: sourceData?.name,
  });

  const { currentStep } = useValues(addCustomSourceLogic);
  const { isOrganization } = useValues(AppLogic);

  if (!sourceData) {
    return null;
  }

  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;

  return (
    <Layout pageChrome={[NAV.SOURCES, NAV.ADD_SOURCE, sourceData.name]}>
      {currentStep === AddCustomSourceSteps.ConfigureCustomStep && (
        <ConfigureCustom sourceData={sourceData} />
      )}
      {currentStep === AddCustomSourceSteps.SaveCustomStep && (
        <SaveCustom sourceData={sourceData} />
      )}
    </Layout>
  );
};
