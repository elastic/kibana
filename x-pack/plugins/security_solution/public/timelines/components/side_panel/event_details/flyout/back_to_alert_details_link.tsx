/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import {
  ISOLATE_HOST,
  UNISOLATE_HOST,
} from '../../../../../detections/components/host_isolation/translations';
import { ALERT_DETAILS } from '../translations';

const BackToAlertDetailsLinkComponent = ({
  showAlertDetails,
  isolateAction,
}: {
  showAlertDetails: () => void;
  isolateAction: 'isolateHost' | 'unisolateHost';
}) => {
  return (
    <>
      <EuiButtonEmpty iconType="arrowLeft" iconSide="left" flush="left" onClick={showAlertDetails}>
        <EuiText size="xs">
          <p>{ALERT_DETAILS}</p>
        </EuiText>
      </EuiButtonEmpty>
      <EuiTitle>
        <h2>{isolateAction === 'isolateHost' ? ISOLATE_HOST : UNISOLATE_HOST}</h2>
      </EuiTitle>
    </>
  );
};

const BackToAlertDetailsLink = React.memo(BackToAlertDetailsLinkComponent);

export { BackToAlertDetailsLink };
