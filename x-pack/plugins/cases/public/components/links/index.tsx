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
  PropsForAnchor,
  PropsForButton,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import * as i18n from './translations';

export interface CasesNavigation {
  href: string;
  onClick?: (arg: React.MouseEvent) => void;
}

export interface CasesGetNavigation<T = React.MouseEvent> {
  getHref: (arg: T) => string;
  onClick: (arg: T) => void;
}

export const LinkButton: React.FC<
  PropsForButton<EuiButtonProps> | PropsForAnchor<EuiButtonProps>
> = ({ children, ...props }) => <EuiButton {...props}>{children}</EuiButton>;

export const LinkAnchor: React.FC<EuiLinkProps> = ({ children, ...props }) => (
  <EuiLink {...props}>{children}</EuiLink>
);

export interface CaseDetailsHrefSchema {
  detailName: string;
  search?: string;
  subCaseId?: string;
}
export interface CaseDetailsNavigation {
  getHref: (caseDetails: CaseDetailsHrefSchema) => string;
  onClick?: (caseDetails: CaseDetailsHrefSchema) => void;
}

const CaseDetailsLinkComponent: React.FC<{
  children?: React.ReactNode;
  detailName: string;
  caseDetailsNavigation: CaseDetailsNavigation;
  subCaseId?: string;
  title?: string;
}> = ({ caseDetailsNavigation, children, detailName, subCaseId, title }) => {
  const { getHref, onClick } = caseDetailsNavigation;
  const goToCaseDetails = useCallback(
    (ev) => {
      ev.preventDefault();
      if (onClick) {
        onClick({ detailName, subCaseId });
      }
    },
    [detailName, onClick, subCaseId]
  );

  const href = getHref({ detailName, subCaseId });

  return (
    <LinkAnchor
      onClick={goToCaseDetails}
      href={href}
      data-test-subj="case-details-link"
      aria-label={i18n.CASE_DETAILS_LINK_ARIA(title ?? detailName)}
    >
      {children ? children : detailName}
    </LinkAnchor>
  );
};
export const CaseDetailsLink = React.memo(CaseDetailsLinkComponent);
CaseDetailsLink.displayName = 'CaseDetailsLink';
