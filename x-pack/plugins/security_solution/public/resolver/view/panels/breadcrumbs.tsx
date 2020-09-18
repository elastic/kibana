/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { i18n } from '@kbn/i18n';
import { EuiBreadcrumb, EuiBetaBadge } from '@elastic/eui';
import React, { memo } from 'react';
import { BetaHeader, ThemedBreadcrumbs } from './styles';
import { useColors } from '../use_colors';

/**
 * Breadcrumb menu with adjustments per direction from UX team
 */
export const Breadcrumbs = memo(function ({ breadcrumbs }: { breadcrumbs: EuiBreadcrumb[] }) {
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
        breadcrumbs={breadcrumbs}
        truncate={false}
      />
    </>
  );
});
