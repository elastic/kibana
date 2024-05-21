/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiLink,
  EuiButtonIcon,
  EuiPopover,
  EuiText,
  EuiToolTip,
  EuiIcon,
  EuiFlexGroup,
  EuiButtonIconPropsForButton,
} from '@elastic/eui';

const insufficientPrivilegesText = i18n.translate(
  'xpack.datasetQuality.insufficientPrivilegesMessage',
  {
    defaultMessage: "You don't have sufficient privileges to access this information.",
  }
);

// @ts-ignore // TODO: Add link to Dataset Quality permissions documentation
const LearnMoreLink = () => (
  <EuiLink data-test-subj="datasetQualityMissingPrivilegesLink" target="_blank">
    <FormattedMessage
      id="xpack.datasetQuality.insufficientPrivilegesLearnMore"
      defaultMessage="Learn more"
    />
  </EuiLink>
);

export const PrivilegesLearnMoreWrapper = ({
  hasPrivileges,
  title,
  fontSize,
  children,
}: {
  hasPrivileges: boolean;
  title: string;
  fontSize: 'xs' | 's';
  children: React.ReactNode;
}) => {
  if (hasPrivileges) {
    return <>{children}</>;
  }

  return (
    <EuiText size={fontSize} data-test-subj={`datasetQualityInsufficientPrivileges-${title}`}>
      {insufficientPrivilegesText}
      {/* <LearnMoreLink /> TODO: Add docs link when available */}
    </EuiText>
  );
};

export const PrivilegesWarningIconWrapper = ({
  hasPrivileges,
  title,
  mode = 'popover',
  iconColor = 'text',
  children,
}: {
  hasPrivileges: boolean;
  title: string;
  mode?: 'tooltip' | 'popover';
  iconColor?: EuiButtonIconPropsForButton['color'];
  children: React.ReactNode;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleButtonClick = useCallback(
    () => setIsPopoverOpen((_isPopoverOpen) => !_isPopoverOpen),
    []
  );
  const handleClosePopover = useCallback(() => setIsPopoverOpen(false), []);

  if (hasPrivileges) {
    return <>{children}</>;
  }

  return mode === 'popover' ? (
    <EuiPopover
      css={{ width: 200 }}
      attachToAnchor={true}
      anchorPosition="downCenter"
      button={
        <EuiButtonIcon
          data-test-subj={`datasetQualityInsufficientPrivileges-${title}`}
          aria-label={insufficientPrivilegesText}
          title={insufficientPrivilegesText}
          iconType="warning"
          color={iconColor}
          onClick={handleButtonClick}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={handleClosePopover}
    >
      {insufficientPrivilegesText} {/* <LearnMoreLink /> TODO: Add docs link when available */}
    </EuiPopover>
  ) : (
    <EuiToolTip content={insufficientPrivilegesText}>
      <EuiFlexGroup alignItems="center">
        <EuiIcon
          data-test-subj={`datasetQualityInsufficientPrivileges-${title}`}
          aria-label={insufficientPrivilegesText}
          title={insufficientPrivilegesText}
          type="warning"
          color={iconColor}
        />
        {children}
      </EuiFlexGroup>
    </EuiToolTip>
  );
};
