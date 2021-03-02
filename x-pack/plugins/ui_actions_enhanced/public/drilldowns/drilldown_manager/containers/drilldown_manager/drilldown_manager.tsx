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
import { DrilldownHelloBar } from '../../components/drilldown_hello_bar';
import { DrilldownManagerContent } from './drilldown_manager_content';

export const DrilldownManager: React.FC = ({}) => {
  const drilldowns = useDrilldownManager();
  const route = drilldowns.useRoute();
  const hideWelcomeMessage = drilldowns.useWelcomeMessage();

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

  const banner = !hideWelcomeMessage && (
    <DrilldownHelloBar
      docsLink={drilldowns.deps.docsLink}
      onHideClick={drilldowns.hideWelcomeMessage}
    />
  );

  return (
    <FlyoutFrame
      title={txtDrilldowns}
      banner={banner}
      footer={footer}
      onClose={drilldowns.close}
      // onBack={isCreateOnly ? undefined : () => setRoute(Routes.Manage)}
      // onBack={() => drilldowns.setScreen('list')}
    >
      <DrilldownManagerContent />
    </FlyoutFrame>
  );
};
