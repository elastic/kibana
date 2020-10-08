/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut, EuiButton } from '@elastic/eui';
import React, { memo, useCallback, useState } from 'react';

import * as i18n from './translations';

const NoApiIntegrationKeyCallOutComponent = () => {
  const [showCallOut, setShowCallOut] = useState(true);
  const handleCallOut = useCallback(() => setShowCallOut(false), [setShowCallOut]);

  return showCallOut ? (
    <EuiCallOut title={i18n.NO_API_INTEGRATION_KEY_CALLOUT_TITLE} color="danger" iconType="alert">
      <p>{i18n.NO_API_INTEGRATION_KEY_CALLOUT_MSG}</p>
      <EuiButton color="danger" onClick={handleCallOut}>
        {i18n.DISMISS_CALLOUT}
      </EuiButton>
    </EuiCallOut>
  ) : null;
};

export const NoApiIntegrationKeyCallOut = memo(NoApiIntegrationKeyCallOutComponent);
