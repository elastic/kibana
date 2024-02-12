/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  IconType,
} from '@elastic/eui';

import { EuiLinkTo } from '../../../../shared/react_router_helpers';

interface IngestionCardProps {
  buttonIcon: IconType;
  buttonLabel: string;
  description: string;
  href?: string;
  isDisabled?: boolean;
  logo: IconType;
  onClick?: () => void;
  title: string;
}

export const IngestionCard: React.FC<IngestionCardProps> = ({
  buttonIcon,
  buttonLabel,
  description,
  href,
  isDisabled,
  logo,
  onClick,
  title,
}) => {
  return (
    <EuiCard
      hasBorder
      isDisabled={isDisabled}
      textAlign="left"
      title={
        <>
          <EuiFlexGroup direction="row" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={logo} size="xxl" />
            </EuiFlexItem>
            <EuiFlexItem>{title}</EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
        </>
      }
      description={
        <EuiText color="subdued" size="s">
          {description}
        </EuiText>
      }
      footer={
        onClick ? (
          <EuiButton isDisabled={isDisabled} iconType={buttonIcon} onClick={onClick} fullWidth>
            {buttonLabel}
          </EuiButton>
        ) : (
          <EuiLinkTo to={href ?? ''} shouldNotCreateHref>
            <EuiButton isDisabled={isDisabled} iconType={buttonIcon} fullWidth>
              {buttonLabel}
            </EuiButton>
          </EuiLinkTo>
        )
      }
    />
  );
};
