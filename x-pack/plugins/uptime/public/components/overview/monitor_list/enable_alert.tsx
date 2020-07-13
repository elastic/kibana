/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButtonIcon, EuiLink, EuiPopover } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { MonitorSummary } from '../../../../common/runtime_types';
import { selectDynamicSettings } from '../../../state/selectors';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

interface Props {
  monitor: MonitorSummary;
}

export const EnableMonitorAlert = (props: Props) => {
  const dss = useSelector(selectDynamicSettings);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const kibana = useKibana();
  const path = kibana.services?.application?.getUrlForApp('uptime', { path: 'settings' });

  const onButtonClick = () => setIsPopoverOpen((val) => !val);
  const closePopover = () => setIsPopoverOpen(false);

  const enableAlert = () => {};

  return dss?.settings?.defaultConnectors?.length > 0 ? (
    <div>
      <EuiButtonIcon style={{ marginRight: 15 }} iconType="bell" onClick={enableAlert} />
    </div>
  ) : (
    <EuiPopover
      button={<EuiButtonIcon style={{ marginRight: 15 }} iconType="bell" onClick={onButtonClick} />}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <div style={{ width: '300px' }}>
        To enable an alert, please define a default connector in{' '}
        <EuiLink href={path}>settings</EuiLink>.
      </div>
    </EuiPopover>
  );
};
