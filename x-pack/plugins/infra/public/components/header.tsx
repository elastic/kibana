/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBreadcrumbDefinition,
  EuiHeader,
  EuiHeaderBreadcrumbs,
  EuiHeaderSection,
} from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import styled from 'styled-components';

interface HeaderProps {
  breadcrumbs?: EuiBreadcrumbDefinition[];
  appendSections?: React.ReactNode;
  intl: InjectedIntl;
}

export const Header = injectI18n(
  class extends React.PureComponent<HeaderProps> {
    public static displayName = 'Header';

    public render() {
      const { breadcrumbs = [], appendSections = null, intl } = this.props;
      const staticBreadcrumbs = [
        {
          href: '#/',
          text: intl.formatMessage({
            id: 'xpack.infra.header.infrastructureTitle',
            defaultMessage: 'Infrastructure',
          }),
        },
      ];

      return (
        <HeaderWrapper>
          <EuiHeaderSection>
            <EuiHeaderBreadcrumbs breadcrumbs={[...staticBreadcrumbs, ...breadcrumbs]} />
          </EuiHeaderSection>
          {appendSections}
        </HeaderWrapper>
      );
    }
  }
);

const HeaderWrapper = styled(EuiHeader)`
  height: 29px;
`;
