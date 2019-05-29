/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHideFor, EuiPageSideBar, EuiShowFor, EuiSideNav } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';

import euiStyled from '../../../../../common/eui_styled_components';
import { InfraMetricLayout, InfraMetricLayoutSection } from '../../pages/metrics/layouts/types';

interface Props {
  layouts: InfraMetricLayout[];
  loading: boolean;
  nodeName: string;
  handleClick: (section: InfraMetricLayoutSection) => () => void;
  intl: InjectedIntl;
}

export const MetricsSideNav = injectI18n(
  class extends React.PureComponent<Props> {
    public static displayName = 'MetricsSideNav';

    public readonly state = {
      isOpenOnMobile: false,
    };

    public render() {
      let content;
      let mobileContent;
      if (!this.props.loading) {
        const entries = this.props.layouts.map(item => {
          return {
            name: item.label,
            id: item.id,
            items: item.sections.map(section => ({
              id: section.id,
              name: section.label,
              onClick: this.props.handleClick(section),
            })),
          };
        });
        content = <EuiSideNav items={entries} />;
        mobileContent = (
          <EuiSideNav
            items={entries}
            mobileTitle={this.props.nodeName}
            toggleOpenOnMobile={this.toggleOpenOnMobile}
            isOpenOnMobile={this.state.isOpenOnMobile}
          />
        );
      }
      return (
        <EuiPageSideBar>
          <EuiHideFor sizes={['xs', 's']}>
            <SideNavContainer>{content}</SideNavContainer>
          </EuiHideFor>
          <EuiShowFor sizes={['xs', 's']}>{mobileContent}</EuiShowFor>
        </EuiPageSideBar>
      );
    }

    private toggleOpenOnMobile = () => {
      this.setState({
        isOpenOnMobile: !this.state.isOpenOnMobile,
      });
    };
  }
);

const SideNavContainer = euiStyled.div`
  position: fixed;
  z-index: 1;
  height: 88vh;
  padding-left: 16px;
  margin-left: -16px;
  overflow-y: auto;
  overflow-x: hidden;
`;
