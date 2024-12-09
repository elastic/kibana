/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiMarkdownEditor,
  EuiMarkdownFormat,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';

interface MigrationRuleQueryProps {
  title: string;
  query: string;
  canEdit?: boolean;
}

export const MigrationRuleQuery: React.FC<MigrationRuleQueryProps> = React.memo(
  ({ title, query, canEdit }) => {
    const { euiTheme } = useEuiTheme();

    const headerComponent = useMemo(() => {
      return (
        <EuiFlexGroup
          alignItems="center"
          css={css`
            height: ${euiTheme.size.xxl};
          `}
        >
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h3>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }, [euiTheme, title]);

    const queryTextComponent = useMemo(() => {
      if (canEdit) {
        return (
          <EuiMarkdownEditor
            aria-label={i18n.TRANSLATED_QUERY_AREAL_LABEL}
            value={query}
            onChange={() => {}}
            height={400}
            initialViewMode={'viewing'}
          />
        );
      } else {
        return <EuiMarkdownFormat>{query}</EuiMarkdownFormat>;
      }
    }, [canEdit, query]);

    return (
      <>
        {headerComponent}
        <EuiHorizontalRule margin="s" />
        {queryTextComponent}
      </>
    );
  }
);
MigrationRuleQuery.displayName = 'MigrationRuleQuery';
