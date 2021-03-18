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
  getCaseDetailsHref: (caseDetails: CaseDetailsHrefSchema) => string;
  onCaseDetailsNavClick: (caseDetails: CaseDetailsHrefSchema) => void;
  subCaseId?: string;
  title?: string;
}> = ({ children, detailName, getCaseDetailsHref, onCaseDetailsNavClick, subCaseId, title }) => {
  const goToCaseDetails = useCallback(
    (ev) => {
      ev.preventDefault();
      onCaseDetailsNavClick({ detailName, subCaseId });
    },
    [detailName, onCaseDetailsNavClick, subCaseId]
  );

  return (
    <LinkAnchor
      onClick={goToCaseDetails}
      href={getCaseDetailsHref({ detailName, subCaseId })}
      data-test-subj="case-details-link"
      aria-label={i18n.CASE_DETAILS_LINK_ARIA(title ?? detailName)}
    >
      {children ? children : detailName}
    </LinkAnchor>
  );
};
export const CaseDetailsLink = React.memo(CaseDetailsLinkComponent);
CaseDetailsLink.displayName = 'CaseDetailsLink';
