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

import { SourceDataItem } from '../../../../types';

import { AddCustomSourceLogic, AddCustomSourceSteps } from './add_custom_source_logic';
import { ConfigureCustom } from './configure_custom';
import { SaveCustom } from './save_custom';

import './add_source.scss';

interface Props {
  sourceData: SourceDataItem;
  initialValue?: string;
}
export const AddCustomSource: React.FC<Props> = ({ sourceData, initialValue = '' }) => {
  const addCustomSourceLogic = AddCustomSourceLogic({ sourceData, initialValue });
  const { currentStep } = useValues(addCustomSourceLogic);
  const { isOrganization } = useValues(AppLogic);

  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;

  return (
    <Layout pageChrome={[NAV.SOURCES, NAV.ADD_SOURCE, sourceData.name || '...']}>
      {currentStep === AddCustomSourceSteps.ConfigureCustomStep && <ConfigureCustom />}
      {currentStep === AddCustomSourceSteps.SaveCustomStep && <SaveCustom />}
    </Layout>
  );
};
