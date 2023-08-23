/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBetaBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPageHeaderContentProps,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { NoDataPageProps } from '@kbn/shared-ux-page-no-data-types';
import { PROFILING_FEEDBACK_LINK } from '@kbn/profiling-shared-ui/common';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { PrimaryProfilingSearchBar } from './primary_profiling_search_bar';

export function ProfilingAppPageTemplate({
  children,
  tabs = [],
  hideSearchBar = false,
  noDataConfig,
  restrictWidth = false,
  pageTitle = i18n.translate('xpack.profiling.appPageTemplate.pageTitle', {
    defaultMessage: 'Universal Profiling',
  }),
  showBetaBadge = false,
}: {
  children: React.ReactElement;
  tabs?: EuiPageHeaderContentProps['tabs'];
  hideSearchBar?: boolean;
  noDataConfig?: NoDataPageProps;
  restrictWidth?: boolean;
  pageTitle?: React.ReactNode;
  showBetaBadge?: boolean;
}) {
  const {
    start: { observabilityShared },
  } = useProfilingDependencies();

  const { PageTemplate: ObservabilityPageTemplate } = observabilityShared.navigation;

  const history = useHistory();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [history.location.pathname]);

  return (
    <ObservabilityPageTemplate
      noDataConfig={noDataConfig}
      pageHeader={{
        rightSideItems: [
          <EuiButton
            href={PROFILING_FEEDBACK_LINK}
            target="_blank"
            color="warning"
            iconType="editorComment"
          >
            {i18n.translate('xpack.profiling.header.giveFeedbackLink', {
              defaultMessage: 'Give feedback',
            })}
          </EuiButton>,
        ],
        pageTitle: (
          <EuiFlexGroup gutterSize="s" alignItems="baseline">
            <EuiFlexItem grow={false}>
              <h1>{pageTitle}</h1>
            </EuiFlexItem>
            {showBetaBadge && (
              <EuiFlexItem grow={false}>
                <EuiBetaBadge
                  label="Beta"
                  color="hollow"
                  tooltipContent={i18n.translate('xpack.profiling.header.betaBadgeTooltip', {
                    defaultMessage: 'This module is not GA. Please help us by reporting any bugs.',
                  })}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
        tabs,
      }}
      restrictWidth={restrictWidth}
      pageSectionProps={{
        contentProps: {
          style: {
            display: 'flex',
            flexGrow: 1,
          },
        },
      }}
    >
      <EuiFlexGroup direction="column" style={{ maxWidth: '100%' }}>
        {!hideSearchBar && (
          <EuiFlexItem grow={false}>
            <EuiPanel hasShadow={false} color="subdued">
              <PrimaryProfilingSearchBar />
              <EuiHorizontalRule />
            </EuiPanel>
          </EuiFlexItem>
        )}
        <EuiFlexItem>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
