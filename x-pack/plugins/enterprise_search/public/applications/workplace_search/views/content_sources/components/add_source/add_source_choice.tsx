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

import { ConfigurationChoice } from './configuration_choice';

import './add_source.scss';

interface AddSourceIntroProps {
  sourceData: SourceDataItem;
}

export const AddSourceChoice: React.FC<AddSourceIntroProps> = (props) => {
  const { name } = props.sourceData;
  const { isOrganization } = useValues(AppLogic);

  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;

  return (
    <Layout pageChrome={[NAV.SOURCES, NAV.ADD_SOURCE, name || '...']}>
      <ConfigurationChoice sourceData={props.sourceData} />
    </Layout>
  );
};
