/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface RefineSearchFooterProps {
  documentSize: number;
  visibleDocumentSize?: number;
  backToTopAnchor: string;
}

const DEFAULT_VISIBLE_THRESHOLD = 1000;

export const RefineSearchPrompt = (props: RefineSearchFooterProps) => {
  const {
    documentSize = 0,
    visibleDocumentSize = DEFAULT_VISIBLE_THRESHOLD,
    backToTopAnchor,
  } = props;

  const { euiTheme } = useEuiTheme();

  const textStyles = useMemo(
    () => ({
      backgroundColor: euiTheme.colors.lightestShade,
      padding: `${euiTheme.size.m} ${euiTheme.size.base}`,
      marginTop: `${euiTheme.size.xs}`,
    }),
    [euiTheme]
  );

  if (documentSize < visibleDocumentSize) {
    return null;
  }

  return (
    <EuiText style={textStyles} textAlign="center" size="s">
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.refineSearchPrompt.prompt"
        defaultMessage="These are the first {visibleDocumentSize} documents matching your search, refine your search to see others."
        values={{ visibleDocumentSize }}
      />
      &nbsp;
      <EuiLink href={`#${backToTopAnchor}`}>
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.refineSearchPrompt.backToTop"
          defaultMessage="Back to top."
        />
      </EuiLink>
    </EuiText>
  );
};
