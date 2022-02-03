/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonProps,
  EuiLink,
  EuiLinkProps,
  EuiToolTip,
  PropsForAnchor,
  PropsForButton,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useCaseViewNavigation, useConfigureCasesNavigation } from '../../common/navigation';
import * as i18n from './translations';

export interface CasesNavigation<T = React.MouseEvent | MouseEvent | null, K = null> {
  href: K extends 'configurable' ? (arg: T) => string : string;
  onClick: K extends 'configurable'
    ? (arg: T, arg2: React.MouseEvent | MouseEvent) => Promise<void> | void
    : (arg: T) => Promise<void> | void;
}

export const LinkButton: React.FC<PropsForButton<EuiButtonProps> | PropsForAnchor<EuiButtonProps>> =
  // TODO: Fix this manually. Issue #123375
  // eslint-disable-next-line react/display-name
  ({ children, ...props }) => <EuiButton {...props}>{children}</EuiButton>;

// TODO: Fix this manually. Issue #123375
// eslint-disable-next-line react/display-name
export const LinkAnchor: React.FC<EuiLinkProps> = ({ children, ...props }) => (
  <EuiLink {...props}>{children}</EuiLink>
);

export interface CaseDetailsLinkProps {
  children?: React.ReactNode;
  detailName: string;
  title?: string;
}

// TODO: Fix this manually. Issue #123375
// eslint-disable-next-line react/display-name
const CaseDetailsLinkComponent: React.FC<CaseDetailsLinkProps> = ({
  children,
  detailName,
  title,
}) => {
  const { getCaseViewUrl, navigateToCaseView } = useCaseViewNavigation();
  const navigateToCaseViewClick = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToCaseView({ detailName });
    },
    [navigateToCaseView, detailName]
  );

  return (
    <LinkAnchor
      onClick={navigateToCaseViewClick}
      href={getCaseViewUrl({ detailName })}
      data-test-subj="case-details-link"
      aria-label={i18n.CASE_DETAILS_LINK_ARIA(title ?? detailName)}
    >
      {children ? children : detailName}
    </LinkAnchor>
  );
};
export const CaseDetailsLink = React.memo(CaseDetailsLinkComponent);
CaseDetailsLink.displayName = 'CaseDetailsLink';

export interface ConfigureCaseButtonProps {
  isDisabled: boolean;
  label: string;
  msgTooltip: JSX.Element;
  showToolTip: boolean;
  titleTooltip: string;
}

// TODO: Fix this manually. Issue #123375
// eslint-disable-next-line react/display-name
const ConfigureCaseButtonComponent: React.FC<ConfigureCaseButtonProps> = ({
  isDisabled,
  label,
  msgTooltip,
  showToolTip,
  titleTooltip,
}: ConfigureCaseButtonProps) => {
  const { getConfigureCasesUrl, navigateToConfigureCases } = useConfigureCasesNavigation();

  const navigateToConfigureCasesClick = useCallback(
    (e) => {
      e.preventDefault();
      navigateToConfigureCases();
    },
    [navigateToConfigureCases]
  );

  const configureCaseButton = useMemo(
    () => (
      <LinkButton
        onClick={navigateToConfigureCasesClick}
        href={getConfigureCasesUrl()}
        iconType="controlsHorizontal"
        isDisabled={isDisabled}
        aria-label={label}
        data-test-subj="configure-case-button"
      >
        {label}
      </LinkButton>
    ),
    [label, isDisabled, navigateToConfigureCasesClick, getConfigureCasesUrl]
  );

  return showToolTip ? (
    <EuiToolTip
      position="top"
      title={titleTooltip}
      content={<p>{msgTooltip}</p>}
      data-test-subj="configure-case-tooltip"
    >
      {configureCaseButton}
    </EuiToolTip>
  ) : (
    <>{configureCaseButton}</>
  );
};

export const ConfigureCaseButton = React.memo(ConfigureCaseButtonComponent);
ConfigureCaseButton.displayName = 'ConfigureCaseButton';
