/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import { WatcherFlyout } from './WatcherFlyout';
import { ApmPluginContext } from '../../../../context/ApmPluginContext';

interface Props {
  urlParams: IUrlParams;
}
interface State {
  isPopoverOpen: boolean;
  activeFlyout: FlyoutName;
}
type FlyoutName = null | 'Watcher';

export class ServiceIntegrations extends React.Component<Props, State> {
  static contextType = ApmPluginContext;
  context!: React.ContextType<typeof ApmPluginContext>;

  public state: State = { isPopoverOpen: false, activeFlyout: null };

  public getWatcherPanelItems = () => {
    const { core } = this.context;

    return [
      {
        name: i18n.translate(
          'xpack.apm.serviceDetails.integrationsMenu.enableWatcherErrorReportsButtonLabel',
          {
            defaultMessage: 'Enable watcher error reports',
          }
        ),
        icon: 'watchesApp',
        onClick: () => {
          this.closePopover();
          this.openFlyout('Watcher');
        },
      },
      {
        name: i18n.translate(
          'xpack.apm.serviceDetails.integrationsMenu.viewWatchesButtonLabel',
          {
            defaultMessage: 'View existing watches',
          }
        ),
        icon: 'watchesApp',
        href: core.http.basePath.prepend(
          '/app/management/insightsAndAlerting/watcher'
        ),
        target: '_blank',
        onClick: () => this.closePopover(),
      },
    ];
  };

  public openPopover = () =>
    this.setState({
      isPopoverOpen: true,
    });

  public closePopover = () =>
    this.setState({
      isPopoverOpen: false,
    });

  public openFlyout = (name: FlyoutName) =>
    this.setState({ activeFlyout: name });

  public closeFlyouts = () => this.setState({ activeFlyout: null });

  public render() {
    const button = (
      <EuiButtonEmpty
        iconType="arrowDown"
        iconSide="right"
        onClick={this.openPopover}
      >
        {i18n.translate(
          'xpack.apm.serviceDetails.integrationsMenu.integrationsButtonLabel',
          {
            defaultMessage: 'Integrations',
          }
        )}
      </EuiButtonEmpty>
    );

    return (
      <>
        <EuiPopover
          id="integrations-menu"
          button={button}
          isOpen={this.state.isPopoverOpen}
          closePopover={this.closePopover}
          panelPaddingSize="none"
          anchorPosition="downRight"
        >
          <EuiContextMenu
            initialPanelId={0}
            panels={[
              {
                id: 0,
                items: this.getWatcherPanelItems(),
              },
            ]}
          />
        </EuiPopover>
        <WatcherFlyout
          isOpen={this.state.activeFlyout === 'Watcher'}
          onClose={this.closeFlyouts}
          urlParams={this.props.urlParams}
        />
      </>
    );
  }
}
