/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBetaBadge,
  EuiButton,
  EuiCallOut,
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
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { PrimaryProfilingSearchBar } from './primary_profiling_search_bar';
import { useLocalStorage } from '../../hooks/use_local_storage';
import { useProfilingSetupStatus } from '../contexts/profiling_setup_status/use_profiling_setup_status';

export const PROFILING_FEEDBACK_LINK = 'https://ela.st/profiling-feedback';

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

  const [privilegesWarningDismissed, setPrivilegesWarningDismissed] = useLocalStorage(
    'profiling.privilegesWarningDismissed',
    false
  );
  const { profilingSetupStatus } = useProfilingSetupStatus();

  const { PageTemplate: ObservabilityPageTemplate } = observabilityShared.navigation;

  const history = useHistory();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [history.location.pathname]);

  return (
    <ObservabilityPageTemplate
      noDataConfig={noDataConfig}
      pageHeader={{
        'data-test-subj': 'profilingPageTemplate',
        rightSideItems: [
          <EuiButton
            data-test-subj="profilingProfilingAppPageTemplateGiveFeedbackButton"
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
        {profilingSetupStatus?.unauthorized === true && privilegesWarningDismissed !== true ? (
          <EuiFlexItem grow={false}>
            <EuiCallOut
              iconType="warning"
              title={i18n.translate('xpack.profiling.privilegesWarningTitle', {
                defaultMessage: 'User privilege limitation',
              })}
            >
              <p>
                {i18n.translate('xpack.profiling.privilegesWarningDescription', {
                  defaultMessage:
                    'Due to privileges issues we could not check the Universal Profiling status. If you encounter any issues or if data fails to load, please contact your administrator for assistance.',
                })}
              </p>
              <EuiButton
                data-test-subj="profilingProfilingAppPageTemplateDismissButton"
                onClick={() => {
                  setPrivilegesWarningDismissed(true);
                }}
              >
                {i18n.translate('xpack.profiling.dismissPrivilegesCallout', {
                  defaultMessage: 'Dismiss',
                })}
              </EuiButton>
            </EuiCallOut>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
