/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { i18n } from '@kbn/i18n';
import { EuiBreadcrumb, EuiBetaBadge } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { BetaHeader, ThemedBreadcrumbs } from './styles';
import { useColors } from '../use_colors';

/**
 * Breadcrumb menu
 */
export const Breadcrumbs = memo(function ({ breadcrumbs }: { breadcrumbs: EuiBreadcrumb[] }) {
  // Just tagging the last crumb with `data-test-subj` for testing
  const crumbsWithLastSubject: EuiBreadcrumb[] = useMemo(() => {
    const lastcrumb = breadcrumbs.slice(-1).map((crumb) => {
      crumb['data-test-subj'] = 'resolver:breadcrumbs:last';
      // Manually set here as setting truncate={true} on ThemedBreadcrumbs truncates all parts of the full path
      crumb.truncate = true;
      return crumb;
    });
    return [...breadcrumbs.slice(0, -1), ...lastcrumb];
  }, [breadcrumbs]);

  const { resolverBreadcrumbBackground, resolverEdgeText } = useColors();
  return (
    <>
      <BetaHeader>
        <EuiBetaBadge
          label={i18n.translate(
            'xpack.securitySolution.enpdoint.resolver.panelutils.betaBadgeLabel',
            {
              defaultMessage: 'BETA',
            }
          )}
        />
      </BetaHeader>
      <ThemedBreadcrumbs
        background={resolverBreadcrumbBackground}
        text={resolverEdgeText}
        breadcrumbs={crumbsWithLastSubject}
        truncate={false}
      />
    </>
  );
});
