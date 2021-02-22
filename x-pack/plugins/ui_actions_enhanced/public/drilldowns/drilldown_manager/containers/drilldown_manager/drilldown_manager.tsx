/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiButton } from '@elastic/eui';
import { useDrilldownManager } from '../context';
import { txtDrilldowns, txtCreateDrilldownButtonLabel, txtEditDrilldownButtonLabel } from './i18n';
import { FlyoutFrame } from '../../components/flyout_frame';
import { FormDrilldownWizard } from '../form_drilldown_wizard';
import { DrilldownHelloBar } from '../../components/drilldown_hello_bar';

export const DrilldownManager: React.FC = ({}) => {
  const drilldowns = useDrilldownManager();
  const screen = drilldowns.useScreen();
  const showWelcomeMessage = drilldowns.useWelcomeMessage();

  const footer =
    screen === 'create' ? (
      <EuiButton
        onClick={() => {
          alert('CREATE DRILL');
        }}
        fill
        // isDisabled={!isActionValid(wizardConfig)}
        data-test-subj={'drilldownWizardSubmit'}
      >
        {screen === 'create' ? txtCreateDrilldownButtonLabel : txtEditDrilldownButtonLabel}
      </EuiButton>
    ) : null;

  // const handleSubmit = () => {};

  // const content = (

  // <FlyoutDrilldownWizard
  //   docsLink={manager.docsLink}
  //   triggerPickerDocsLink={manager.triggerPickerDocsLink}
  //   showWelcomeMessage={manager.showWelcomeMessage}
  //   onWelcomeHideClick={manager.hideWelcomeMessage}
  //   drilldownActionFactories={manager.actionFactories}
  //   onClose={manager.onClose}
  //   // mode={route === Routes.Create ? 'create' : 'edit'}
  //   mode={'create'}
  //   // onBack={isCreateOnly ? undefined : () => setRoute(Routes.Manage)}
  //   onBack={() => {}}
  //   onSubmit={handleSubmit}
  //   onDelete={() => {
  //     // deleteDrilldown(currentEditId!);
  //     // setRoute(Routes.Manage);
  //     // setCurrentEditId(null);
  //   }}
  //   actionFactoryPlaceContext={manager.placeContext}
  //   // initialDrilldownWizardConfig={resolveInitialDrilldownWizardConfig()}
  //   initialDrilldownWizardConfig={{ name: '' }}
  //   supportedTriggers={manager.triggers}
  //   getTrigger={manager.getTrigger}
  // />
  // );

  const content = screen === 'create' ? <FormDrilldownWizard /> : null;

  const flyoutFrame = (
    <FlyoutFrame
      title={txtDrilldowns}
      footer={footer}
      onClose={drilldowns.close}
      // onBack={isCreateOnly ? undefined : () => setRoute(Routes.Manage)}
      // onBack={() => drilldowns.setScreen('list')}
      banner={
        showWelcomeMessage && (
          <DrilldownHelloBar
            docsLink={drilldowns.deps.docsLink}
            onHideClick={drilldowns.hideWelcomeMessage}
          />
        )
      }
    >
      {content}
    </FlyoutFrame>
  );

  return flyoutFrame;
};
