/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormCreateDrilldown } from '../form_create_drilldown';
import { FlyoutFrame } from '../flyout_frame';
import { txtCreateDrilldown } from './i18n';
import { FlyoutCreateDrilldownActionContext } from '../../actions';

export interface FlyoutCreateDrilldownProps {
  context: FlyoutCreateDrilldownActionContext;
  onClose?: () => void;
}

export const FlyoutCreateDrilldown: React.FC<FlyoutCreateDrilldownProps> = ({
  context,
  onClose,
}) => {
  const footer = (
    <EuiButton onClick={() => {}} fill>
      {txtCreateDrilldown}
    </EuiButton>
  );

  return (
    <FlyoutFrame title={txtCreateDrilldown} footer={footer} onClose={onClose}>
      <FormCreateDrilldown />
    </FlyoutFrame>
  );
};
