/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiButton, EuiFlexItem, EuiLink, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface OpenInDevConsoleButtonProps {
  dataTestSubjPrefix?: string;
  enableButton: boolean;
  learnMoreUrl?: string;
  loadFromUrl: string;
  popoverContent?: string;
  title: string;
}

const OpenInDevConsoleButtonComponent: React.FC<OpenInDevConsoleButtonProps> = ({
  dataTestSubjPrefix = 'open-in-dev-console',
  enableButton,
  learnMoreUrl,
  loadFromUrl,
  popoverContent,
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
          target="_self"
          isDisabled={false}
          data-test-subj={`${dataTestSubjPrefix}-enabled-module-button`}
        >
          {title}
        </EuiButton>
      ) : popoverContent ? (
        <EuiPopover
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          button={
            <EuiButton
              href={href}
              color="warning"
              isDisabled={true}
              data-test-subj={`${dataTestSubjPrefix}-disabled-module-button`}
              onMouseEnter={onMouseEnter}
            >
              {title}
            </EuiButton>
          }
        >
          <p>
            {popoverContent}{' '}
            {learnMoreUrl && (
              <EuiLink href={learnMoreUrl} target="_blank" external={false}>
                <FormattedMessage
                  defaultMessage="Learn More"
                  id="xpack.securitySolution.openInDevConsole.tooltipTitle"
                />
              </EuiLink>
            )}
          </p>
        </EuiPopover>
      ) : (
        <EuiButton
          href={href}
          color="warning"
          isDisabled={true}
          data-test-subj={`${dataTestSubjPrefix}-disabled-module-button`}
          onMouseEnter={onMouseEnter}
        >
          {title}
        </EuiButton>
      )}
    </EuiFlexItem>
  ) : null;
};

export const OpenInDevConsoleButton = React.memo(OpenInDevConsoleButtonComponent);
OpenInDevConsoleButton.displayName = 'OpenInDevConsoleButton';
