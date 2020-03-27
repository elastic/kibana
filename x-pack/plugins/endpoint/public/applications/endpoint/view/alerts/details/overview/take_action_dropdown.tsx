/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useState, useCallback } from 'react';
import { EuiPopover, EuiFormRow, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import { AlertAction } from '../../../../store/alerts';
import { useAlertListSelector } from '../../hooks/use_alerts_selector';
import * as selectors from '../../../../store/alerts/selectors';

const TakeActionButton = memo(({ onClick }: { onClick: () => void }) => (
  <EuiButton
    iconType="arrowDown"
    iconSide="right"
    data-test-subj="alertDetailTakeActionDropdownButton"
    onClick={onClick}
  >
    <FormattedMessage
      id="xpack.endpoint.application.endpoint.alertDetails.takeAction.title"
      defaultMessage="Take Action"
    />
  </EuiButton>
));

export const TakeActionDropdown = memo(() => {
  const dispatch = useDispatch<(action: AlertAction) => void>();
  const alertDetails = useAlertListSelector(selectors.selectedAlertDetailsData);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const onClick = useCallback(() => {
    setIsDropdownOpen(!isDropdownOpen);
  }, [isDropdownOpen]);

  const closePopover = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  const closeAlert = useCallback(() => {
    if (alertDetails) {
      dispatch({
        type: 'userClosedAlerts',
        payload: [alertDetails.id],
      });
    }
  }, [alertDetails, dispatch]);

  return (
    <EuiPopover
      button={<TakeActionButton onClick={onClick} />}
      isOpen={isDropdownOpen}
      anchorPosition="downRight"
      closePopover={closePopover}
      data-test-subj="alertListTakeActionDropdownContent"
    >
      <EuiFormRow>
        <EuiButtonEmpty
          data-test-subj="alertDetailTakeActionCloseAlertButton"
          color="text"
          iconType="folderCheck"
          onClick={closeAlert}
        >
          <FormattedMessage
            id="xpack.endpoint.application.endpoint.alertDetails.takeAction.close"
            defaultMessage="Close Alert"
          />
        </EuiButtonEmpty>
      </EuiFormRow>

      <EuiFormRow>
        <EuiButtonEmpty
          data-test-subj="alertDetailTakeActionWhitelistButton"
          color="text"
          iconType="listAdd"
        >
          <FormattedMessage
            id="xpack.endpoint.application.endpoint.alertDetails.takeAction.whitelist"
            defaultMessage="Whitelist..."
          />
        </EuiButtonEmpty>
      </EuiFormRow>
    </EuiPopover>
  );
});
