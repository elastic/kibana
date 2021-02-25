/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiButton, EuiTabbedContent, EuiTabbedContentProps } from '@elastic/eui';
import { useDrilldownManager } from '../context';
import { txtDrilldowns, txtCreateDrilldownButtonLabel, txtEditDrilldownButtonLabel } from './i18n';
import { FlyoutFrame } from '../../components/flyout_frame';
import { FormDrilldownWizard } from '../form_drilldown_wizard';
import { DrilldownHelloBar } from '../../components/drilldown_hello_bar';
import { DrilldownList } from '../drilldown_list';

export const DrilldownManager: React.FC = ({}) => {
  const drilldowns = useDrilldownManager();
  const route = drilldowns.useRoute();
  const hideWelcomeMessage = drilldowns.useWelcomeMessage();

  const tabs: EuiTabbedContentProps['tabs'] = [
    {
      id: 'create',
      name: 'Create new',
      content: <FormDrilldownWizard />,
    },
    {
      id: 'list',
      name: 'Manage',
      content: 'manage...',
    },
  ];

  const footer =
    route[0] === 'create' ? (
      <EuiButton
        onClick={drilldowns.onCreateDrilldown}
        fill
        // isDisabled={!isActionValid(wizardConfig)}
        data-test-subj={'drilldownWizardSubmit'}
      >
        {route[0] === 'create' ? txtCreateDrilldownButtonLabel : txtEditDrilldownButtonLabel}
      </EuiButton>
    ) : null;

  let content: React.ReactNode = null;
  if (route[0] === 'create') content = <FormDrilldownWizard />;
  if (route[0] === 'manage') content = <DrilldownList />;

  const flyoutFrame = (
    <FlyoutFrame
      title={txtDrilldowns}
      footer={footer}
      onClose={drilldowns.close}
      // onBack={isCreateOnly ? undefined : () => setRoute(Routes.Manage)}
      // onBack={() => drilldowns.setScreen('list')}
      banner={
        !hideWelcomeMessage && (
          <DrilldownHelloBar
            docsLink={drilldowns.deps.docsLink}
            onHideClick={drilldowns.hideWelcomeMessage}
          />
        )
      }
    >
      <EuiTabbedContent
        tabs={tabs}
        selectedTab={tabs.find(({ id }) => id === route[0])}
        onTabClick={({ id }) => drilldowns.setRoute([id])}
      />
      {content}
    </FlyoutFrame>
  );

  return flyoutFrame;
};
