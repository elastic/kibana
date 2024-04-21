/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonProps, EuiLinkProps, PropsForAnchor, PropsForButton } from '@elastic/eui';
import { EuiButton, EuiLink, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useCaseViewNavigation, useConfigureCasesNavigation } from '../../common/navigation';
import * as i18n from './translations';

export interface CasesNavigation<T = React.MouseEvent | MouseEvent | null, K = null> {
  href: K extends 'configurable' ? (arg: T) => string : string;
  onClick: K extends 'configurable'
    ? (arg: T, arg2: React.MouseEvent | MouseEvent) => Promise<void> | void
    : (arg: T) => Promise<void> | void;
}

export const LinkButton =
  ({ children, ...props }: PropsForButton<EuiButtonProps> | PropsForAnchor<EuiButtonProps>) => <EuiButton {...props}>{children}</EuiButton>;

export const LinkAnchor = ({ children, ...props }: EuiLinkProps) => (
  <EuiLink {...props}>{children}</EuiLink>
);

export interface CaseDetailsLinkProps {
  children?: React.ReactNode;
  detailName: string;
  title?: string;
}

const CaseDetailsLinkComponent = ({
  children,
  detailName,
  title,
}: CaseDetailsLinkProps) => {
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
  label: string;
  msgTooltip: JSX.Element;
  showToolTip: boolean;
  titleTooltip: string;
}

const ConfigureCaseButtonComponent = ({
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
        isDisabled={false}
        aria-label={label}
        data-test-subj="configure-case-button"
      >
        {label}
      </LinkButton>
    ),
    [label, navigateToConfigureCasesClick, getConfigureCasesUrl]
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
