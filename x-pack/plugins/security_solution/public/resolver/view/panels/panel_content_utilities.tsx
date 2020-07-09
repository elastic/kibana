/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { EuiBreadcrumbs, Breadcrumb, EuiCode } from '@elastic/eui';
import styled from 'styled-components';
import React, { memo } from 'react';
import { useResolverTheme } from '../assets';

/**
 * A bold version of EuiCode to display certain titles with
 */
export const BoldCode = styled(EuiCode)`
  &.euiCodeBlock code.euiCodeBlock__code {
    font-weight: 900;
  }
`;

/**
 * The two query parameters we read/write on to control which view the table presents:
 */
export interface CrumbInfo {
  readonly crumbId: string;
  readonly crumbEvent: string;
}

const ThemedBreadcrumbs = styled(EuiBreadcrumbs)<{ background: string; text: string }>`
  &.euiBreadcrumbs.euiBreadcrumbs--responsive {
    background-color: ${(props) => props.background};
    color: ${(props) => props.text};
    padding: 1em;
    border-radius: 5px;
  }

  & .euiBreadcrumbSeparator {
    background: ${(props) => props.text};
  }
`;

/**
 * Breadcrumb menu with adjustments per direction from UX team
 */
export const StyledBreadcrumbs = memo(function StyledBreadcrumbs({
  breadcrumbs,
  truncate,
}: {
  breadcrumbs: Breadcrumb[];
  truncate?: boolean;
}) {
  const {
    colorMap: { resolverBreadcrumbBackground, resolverEdgeText },
  } = useResolverTheme();
  return (
    <ThemedBreadcrumbs
      background={resolverBreadcrumbBackground}
      text={resolverEdgeText}
      breadcrumbs={breadcrumbs}
      truncate={truncate}
    />
  );
});

/**
 * Long formatter (to second) for DateTime
 */
export const formatter = new Intl.DateTimeFormat(i18n.getLocale(), {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const invalidDateText = i18n.translate(
  'xpack.securitySolution.enpdoint.resolver.panelutils.invaliddate',
  {
    defaultMessage: 'Invalid Date',
  }
);
/**
 * @returns {string} A nicely formatted string for a date
 */
export function formatDate(
  /** To be passed through Date->Intl.DateTimeFormat */ timestamp: ConstructorParameters<
    typeof Date
  >[0]
): string {
  const date = new Date(timestamp);
  if (isFinite(date.getTime())) {
    return formatter.format(date);
  } else {
    return invalidDateText;
  }
}
