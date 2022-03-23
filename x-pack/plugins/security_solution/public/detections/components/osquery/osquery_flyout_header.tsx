/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiText, EuiTitle } from '@elastic/eui';
import { BACK_TO_ALERT_DETAILS } from './translations';

interface IProps {
  primaryText: React.ReactElement;
  handleClick: () => void;
}

const OsqueryEventDetailsHeaderComponent: React.FC<IProps> = ({ primaryText, handleClick }) => {
  return (
    <>
      <EuiButtonEmpty iconType="arrowLeft" iconSide="left" flush="left" onClick={handleClick}>
        <EuiText size="xs">
          <p>{BACK_TO_ALERT_DETAILS}</p>
        </EuiText>
      </EuiButtonEmpty>
      <EuiTitle>{primaryText}</EuiTitle>
    </>
  );
};

export const OsqueryEventDetailsHeader = React.memo(OsqueryEventDetailsHeaderComponent);
