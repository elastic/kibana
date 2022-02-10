/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiText, EuiTitle } from '@elastic/eui';
import { ALERT_DETAILS } from './translations';

interface IProps {
  primaryText: React.ReactElement;
  onClick: () => void;
}

export const EventDetailsBackToAlertDetailsLink: React.FC<IProps> = ({ primaryText, onClick }) => {
  return (
      <EuiButtonEmpty iconType="arrowLeft" iconSide="left" flush="left" onClick={onClick}>
        <EuiText size="xs">
          <p>{ALERT_DETAILS}</p>
        </EuiText>
      </EuiButtonEmpty>
      <EuiTitle>{primaryText}</EuiTitle>
  );
};
