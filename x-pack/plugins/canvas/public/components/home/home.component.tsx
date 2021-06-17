/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { withSuspense } from '../../../../../../src/plugins/presentation_util/public';

import { ComponentStrings } from '../../../i18n';
import { WorkpadCreate } from './workpad_create';
import { LazyWorkpadTemplates } from './workpad_templates';
import { LazyMyWorkpads } from './my_workpads';

const { Home: strings } = ComponentStrings;

export type HomePageTab = 'workpads' | 'templates';

export interface Props {
  activeTab?: HomePageTab;
}

const WorkpadTemplates = withSuspense(LazyWorkpadTemplates);
const MyWorkpads = withSuspense(LazyMyWorkpads);

export const Home = ({ activeTab = 'workpads' }: Props) => {
  const [tab, setTab] = useState(activeTab);

  return (
    <EuiPageTemplate
      pageHeader={{
        pageTitle: 'Canvas',
        rightSideItems: [<WorkpadCreate />],
        tabs: [
          {
            label: strings.getMyWorkpadsTabLabel(),
            id: 'myWorkpads',
            isSelected: tab === 'workpads',
            onClick: () => setTab('workpads'),
          },
          {
            label: strings.getWorkpadTemplatesTabLabel(),
            id: 'workpadTemplates',
            'data-test-subj': 'workpadTemplates',
            isSelected: tab === 'templates',
            onClick: () => setTab('templates'),
          },
        ],
      }}
    >
      {tab === 'workpads' ? <MyWorkpads /> : <WorkpadTemplates />}
    </EuiPageTemplate>
  );
};
