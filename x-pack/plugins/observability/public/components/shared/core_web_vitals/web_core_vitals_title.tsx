/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButtonIcon, EuiLink, EuiPopover, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

const CORE_WEB_VITALS = i18n.translate('xpack.observability.ux.coreWebVitals', {
  defaultMessage: 'Core web vitals',
});

export function WebCoreVitalsTitle() {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = () => setIsPopoverOpen(false);

  return (
    <EuiTitle size="xs">
      <h3>
        {CORE_WEB_VITALS}
        <EuiPopover
          isOpen={isPopoverOpen}
          button={
            <EuiButtonIcon
              onClick={() => setIsPopoverOpen(true)}
              color={'text'}
              iconType={'questionInCircle'}
            />
          }
          closePopover={closePopover}
        >
          <div>
            <EuiText>
              <FormattedMessage
                id="xpack.observability.ux.dashboard.webCoreVitals.help"
                defaultMessage="Learn more about"
              />
              <EuiLink href="https://web.dev/vitals/" external target="_blank">
                {' '}
                {CORE_WEB_VITALS}
              </EuiLink>
            </EuiText>
          </div>
        </EuiPopover>
      </h3>
    </EuiTitle>
  );
}
