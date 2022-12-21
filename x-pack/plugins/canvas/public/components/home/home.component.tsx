/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/kibana-react-plugin/public';
import { withSuspense } from '@kbn/presentation-util-plugin/public';

import { WorkpadCreate } from './workpad_create';
import { LazyWorkpadTemplates } from './workpad_templates';
import { LazyMyWorkpads } from './my_workpads';

export type HomePageTab = 'workpads' | 'templates';

export interface Props {
  activeTab?: HomePageTab;
}

const WorkpadTemplates = withSuspense(LazyWorkpadTemplates);
const MyWorkpads = withSuspense(LazyMyWorkpads);

export const Home = ({ activeTab = 'workpads' }: Props) => {
  const [tab, setTab] = useState(activeTab);

  return (
    <KibanaPageTemplate
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
    </KibanaPageTemplate>
  );
};

const strings = {
  getMyWorkpadsTabLabel: () =>
    i18n.translate('xpack.canvas.home.myWorkpadsTabLabel', {
      defaultMessage: 'My workpads',
    }),
  getWorkpadTemplatesTabLabel: () =>
    i18n.translate('xpack.canvas.home.workpadTemplatesTabLabel', {
      defaultMessage: 'Templates',
      description: 'The label for the tab that displays a list of designed workpad templates.',
    }),
};
