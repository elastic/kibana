/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { selectDynamicSettings } from '../../../state/selectors';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import {
  alertsSelector,
  connectorsSelector,
  createAlertAction,
  deleteAlertAction,
  isAlertDeleting,
  newAlertSelector,
} from '../../../state/alerts/alerts';
import { BellIcon } from './bell_icon';

interface Props {
  monitorId: string;
  monitorName?: string;
}

export const EnableMonitorAlert = ({ monitorId, monitorName }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const dss = useSelector(selectDynamicSettings);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const kibana = useKibana();
  const dispatch = useDispatch();

  const path = kibana.services?.application?.getUrlForApp('uptime', { path: 'settings' });

  const onButtonClick = () => setIsPopoverOpen((val) => !val);
  const closePopover = () => setIsPopoverOpen(false);

  const { data: actionConnectors } = useSelector(connectorsSelector);

  const { data: alerts, loading } = useSelector(alertsSelector);
  const { loading: isCreating } = useSelector(newAlertSelector);

  const isDeleting = useSelector(isAlertDeleting);

  const hasAlert = (alerts?.data ?? []).find((alert) => alert.params.search.includes(monitorId));

  const defaultActions = (actionConnectors ?? []).filter((act) =>
    dss.settings?.defaultConnectors.includes(act.id)
  );

  const enableAlert = () => {
    dispatch(
      createAlertAction.get({
        defaultActions,
        monitorId,
        monitorName,
      })
    );
    setIsLoading(true);
  };

  const disableAlert = () => {
    if (hasAlert) {
      dispatch(
        deleteAlertAction.get({
          alertId: hasAlert.id,
        })
      );
      setIsLoading(true);
    }
  };

  useEffect(() => {
    setIsLoading(false);
  }, [hasAlert]);

  const defaultConnectors = dss?.settings?.defaultConnectors ?? [];

  return defaultConnectors.length > 0 ? (
    <div className="eui-displayInlineBlock" style={{ marginRight: 15 }}>
      {((isCreating || isDeleting) && isLoading) || loading ? (
        <EuiLoadingSpinner />
      ) : (
        <EuiToolTip content={hasAlert ? 'Disable down alert' : 'Enable down alert'}>
          <EuiButtonIcon
            aria-label={'Enable down alert'}
            onClick={hasAlert ? disableAlert : enableAlert}
            iconType={hasAlert ? BellIcon : 'bell'}
            size="m"
          />
        </EuiToolTip>
      )}
    </div>
  ) : (
    <EuiPopover
      button={
        <EuiButtonIcon
          aria-label={'Enable down alert'}
          style={{ marginRight: 15 }}
          iconType={'bell'}
          onClick={onButtonClick}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <EuiText style={{ width: '350px' }}>
        To start enabling alerts, please define a default alert action connector in{' '}
        <EuiLink href={path}>Settings</EuiLink>.
      </EuiText>
    </EuiPopover>
  );
};
