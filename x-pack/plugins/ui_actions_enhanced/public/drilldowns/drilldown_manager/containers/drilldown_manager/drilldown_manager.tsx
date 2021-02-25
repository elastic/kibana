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
  const screen = drilldowns.useScreen();
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
    screen === 'create' ? (
      <EuiButton
        onClick={drilldowns.onCreateDrilldown}
        fill
        // isDisabled={!isActionValid(wizardConfig)}
        data-test-subj={'drilldownWizardSubmit'}
      >
        {screen === 'create' ? txtCreateDrilldownButtonLabel : txtEditDrilldownButtonLabel}
      </EuiButton>
    ) : null;

  let content: React.ReactNode = null;
  if (screen === 'create') content = <FormDrilldownWizard />;
  if (screen === 'list') content = <DrilldownList />;

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
      <EuiTabbedContent tabs={tabs} selectedTab={tabs[0]} onTabClick={() => {}} />
      {content}
    </FlyoutFrame>
  );

  return flyoutFrame;
};
