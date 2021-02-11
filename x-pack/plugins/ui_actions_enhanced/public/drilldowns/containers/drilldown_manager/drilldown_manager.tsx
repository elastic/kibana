/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiButton } from '@elastic/eui';
import { useDrilldownManager } from '../context';
import { FlyoutDrilldownWizard } from '../../components/flyout_drilldown_wizard';
import { txtDrilldowns, txtCreateDrilldownButtonLabel, txtEditDrilldownButtonLabel } from './i18n';
import { FlyoutFrame } from '../../components/flyout_frame';
import { DrilldownHelloBar } from '../../components/drilldown_hello_bar';
import { FormDrilldownWizard } from '../form_drilldown_wizard';

export const DrilldownManager: React.FC = ({}) => {
  const manager = useDrilldownManager();

  const footer = (
    <EuiButton
      onClick={() => {
        // if (isActionValid(wizardConfig)) {
        //   onSubmit(wizardConfig);
        // }
      }}
      fill
      // isDisabled={!isActionValid(wizardConfig)}
      data-test-subj={'drilldownWizardSubmit'}
    >
      {manager.currentTab === 'create'
        ? txtCreateDrilldownButtonLabel
        : txtEditDrilldownButtonLabel}
    </EuiButton>
  );

  const handleSubmit = () => {};

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

  const content = <FormDrilldownWizard mode={'create'} />;

  const flyoutFrame = (
    <FlyoutFrame
      title={txtDrilldowns}
      footer={footer}
      onClose={manager.onClose}
      // onBack={isCreateOnly ? undefined : () => setRoute(Routes.Manage)}
      // banner={
      //   shouldShowWelcomeMessage && (
      //     <DrilldownHelloBar docsLink={docsLink} onHideClick={onHideWelcomeMessage} />
      //   )
      // }
    >
      {content}
    </FlyoutFrame>
  );

  return flyoutFrame;
};
