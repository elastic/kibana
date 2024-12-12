/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { Suspense, type FC } from 'react';
import { EuiSkeletonRectangle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Props as NavigationProps } from './navigation';

const SideNavComponentLazy = React.lazy(() => import('./navigation'));

export const SideNavComponent: FC<NavigationProps> = (props) => (
  <Suspense
    fallback={
      <EuiSkeletonRectangle
        css={css`
          margin: ${euiThemeVars.euiSize};
        `}
        width={16}
        height={16}
        borderRadius="s"
        contentAriaLabel={i18n.translate('xpack.serverless.nav.loadingSolutionNavigationLabel', {
          defaultMessage: 'Loading solution navigation',
        })}
      />
    }
  >
    <SideNavComponentLazy {...props} />
  </Suspense>
);

export { manageOrgMembersNavCardName, generateManageOrgMembersNavCard } from './nav_cards';
