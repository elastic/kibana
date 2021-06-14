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

export interface CasesNavigation<T = React.MouseEvent | MouseEvent, K = null> {
  href: K extends 'configurable' ? (arg: T) => string : string;
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

const CaseDetailsLinkComponent: React.FC<{
  children?: React.ReactNode;
  detailName: string;
  caseDetailsNavigation: CasesNavigation<CaseDetailsHrefSchema, 'configurable'>;
  subCaseId?: string;
  title?: string;
}> = ({ caseDetailsNavigation, children, detailName, subCaseId, title }) => {
  const { href: getHref, onClick } = caseDetailsNavigation;
  const goToCaseDetails = useCallback(
    (ev) => {
      if (onClick) {
        ev.preventDefault();
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
