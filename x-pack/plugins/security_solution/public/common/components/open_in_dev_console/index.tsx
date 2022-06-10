/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiButton, EuiFlexItem, EuiLink, EuiPopover } from '@elastic/eui';

interface OpenInDevConsoleButtonProps {
  dataTestSubjPrefix?: string;
  loadFromUrl: string;
  enableButton: boolean;
  title: string;
}

const OpenInDevConsoleButtonComponent: React.FC<OpenInDevConsoleButtonProps> = ({
  dataTestSubjPrefix = 'open-in-dev-console',
  loadFromUrl,
  enableButton,
  title,
}) => {
  const href = `/app/dev_tools#/console?load_from=${loadFromUrl}`;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onMouseEnter = () => {
    setIsPopoverOpen(true);
  };

  const closePopover = () => setIsPopoverOpen(false);

  return loadFromUrl ? (
    <EuiFlexItem>
      {enableButton != null && enableButton ? (
        <EuiButton
          href={href}
          color="warning"
          target="_blank"
          isDisabled={false}
          data-test-subj={`${dataTestSubjPrefix}-enabled-module-button`}
        >
          {title}
        </EuiButton>
      ) : (
        <EuiPopover
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          button={
            <EuiButton
              href={href}
              color="warning"
              target="_blank"
              isDisabled={true}
              data-test-subj={`${dataTestSubjPrefix}-disabled-module-button`}
              onMouseEnter={onMouseEnter}
            >
              {title}
            </EuiButton>
          }
        >
          <p>
            {`Make sure you have alerts available before enabling the module.`}{' '}
            <EuiLink
              href="https://www.elastic.co/guide/en/security/current/detection-engine-overview.html"
              target="_blank"
              external={false}
            >
              {'Learn More'}
            </EuiLink>
          </p>
        </EuiPopover>
      )}
    </EuiFlexItem>
  ) : null;
};

export const OpenInDevConsoleButton = React.memo(OpenInDevConsoleButtonComponent);
OpenInDevConsoleButton.displayName = 'OpenInDevConsoleButton';
