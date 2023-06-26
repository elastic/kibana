/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiButtonEmpty, EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHistory } from 'react-router-dom';

export const ViewLocationMonitors = ({
  count,
  locationName,
}: {
  count: number;
  locationName: string;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => setIsPopoverOpen((prevState) => !prevState);
  const closePopover = () => setIsPopoverOpen(false);

  const button = (
    <EuiButtonEmpty data-test-subj="syntheticsViewLocationMonitorsButton" onClick={onButtonClick}>
      {count}
    </EuiButtonEmpty>
  );

  const history = useHistory();

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <FormattedMessage
        id="xpack.synthetics.monitorManagement.viewMonitors"
        defaultMessage="{name} is used in {count, number} {count, plural,one {monitor} other {monitors}}."
        values={{ count, name: <strong>{locationName}</strong> }}
      />
      <EuiSpacer size="s" />
      {count > 0 ? (
        <EuiButton
          data-test-subj="syntheticsViewLocationMonitorsButton"
          href={history.createHref({
            pathname: '/monitors',
            search: `?locations=${JSON.stringify([locationName])}`,
          })}
        >
          {VIEW_LOCATION_MONITORS}
        </EuiButton>
      ) : (
        <EuiButton
          data-test-subj="syntheticsViewLocationMonitorsButton"
          href={history.createHref({
            pathname: '/add-monitor',
          })}
        >
          {CREATE_MONITOR}
        </EuiButton>
      )}
    </EuiPopover>
  );
};

const VIEW_LOCATION_MONITORS = i18n.translate(
  'xpack.synthetics.monitorManagement.viewLocationMonitors',
  {
    defaultMessage: 'View monitors',
  }
);

const CREATE_MONITOR = i18n.translate('xpack.synthetics.monitorManagement.createLocationMonitors', {
  defaultMessage: 'Create monitor',
});
