/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHeader, EuiHeaderBreadcrumbs, EuiHeaderSection } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import isEqual from 'lodash/fp/isEqual';
import React from 'react';
import styled from 'styled-components';

import { Breadcrumb } from 'ui/chrome/directives/header_global_nav';
import { WithKibanaChrome } from '../containers/with_kibana_chrome';

interface HeaderProps extends LegacyHeaderProps {
  intl: InjectedIntl;
}

interface LegacyHeaderProps {
  breadcrumbs?: Breadcrumb[];
  appendSections?: React.ReactNode;
}

interface ExternalHeaderProps {
  breadcrumbs?: Breadcrumb[];
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
}

export const Header = injectI18n(({ appendSections, breadcrumbs, intl }: HeaderProps) => {
  const prefixedBreadcrumbs = [
    {
      href: '#/',
      text: intl.formatMessage({
        id: 'xpack.infra.header.infrastructureTitle',
        defaultMessage: 'Infrastructure',
      }),
    },
    ...(breadcrumbs || []),
  ];

  return (
    <WithKibanaChrome>
      {({ setBreadcrumbs, uiSettings: { k7Design } }) =>
        k7Design ? (
          <ExternalHeader breadcrumbs={prefixedBreadcrumbs} setBreadcrumbs={setBreadcrumbs} />
        ) : (
          <LegacyHeader appendSections={appendSections} breadcrumbs={prefixedBreadcrumbs} />
        )
      }
    </WithKibanaChrome>
  );
});

class ExternalHeader extends React.Component<ExternalHeaderProps> {
  public componentDidMount() {
    this.setBreadcrumbs();
  }

  public componentDidUpdate(prevProps: ExternalHeaderProps) {
    if (!isEqual(this.props.breadcrumbs, prevProps.breadcrumbs)) {
      this.setBreadcrumbs();
    }
  }

  public render() {
    return null;
  }

  private setBreadcrumbs = () => {
    this.props.setBreadcrumbs(this.props.breadcrumbs || []);
  };
}

const LegacyHeader: React.SFC<LegacyHeaderProps> = ({ appendSections, breadcrumbs = [] }) => (
  <HeaderWrapper>
    <EuiHeaderSection>
      <EuiHeaderBreadcrumbs breadcrumbs={breadcrumbs} />
    </EuiHeaderSection>
    {appendSections}
  </HeaderWrapper>
);

const HeaderWrapper = styled(EuiHeader)`
  height: 29px;
`;
