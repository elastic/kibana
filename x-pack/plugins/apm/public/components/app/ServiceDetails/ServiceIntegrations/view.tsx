/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiContextMenu,
  EuiContextMenuPanelItemDescriptor,
  EuiPopover
} from '@elastic/eui';
import React from 'react';
import chrome from 'ui/chrome';
import { MachineLearningFlyout } from './MachineLearningFlyout';
// @ts-ignore
import { WatcherFlyout } from './WatcherFlyout';

interface ServiceIntegrationProps {
  mlAvailable: boolean;
  location: any;
  serviceName: string;
  transactionType?: string;
  serviceTransactionTypes: string[];
}
interface ServiceIntegrationState {
  isPopoverOpen: boolean;
  activeFlyout: FlyoutName;
}
type FlyoutName = null | 'ML' | 'Watcher';

export class ServiceIntegrationsView extends React.Component<
  ServiceIntegrationProps,
  ServiceIntegrationState
> {
  public state = { isPopoverOpen: false, activeFlyout: null };
  public panelItems: EuiContextMenuPanelItemDescriptor[] = [];

  public addMlPanelItems = () => {
    this.panelItems = this.panelItems.concat([
      {
        name: 'Enable ML anomaly detection',
        icon: 'machineLearningApp',
        toolTipContent: 'Set up a machine learning job for this service',
        onClick: () => {
          this.closePopover();
          this.openFlyout('ML');
        }
      },
      {
        name: 'View existing ML jobs',
        icon: 'machineLearningApp',
        href: chrome.addBasePath('/app/ml'),
        target: '_blank',
        onClick: () => this.closePopover()
      }
    ]);
  };

  public addWatcherPanelItems = () => {
    this.panelItems = this.panelItems.concat([
      {
        name: 'Enable watcher error reports',
        icon: 'watchesApp',
        onClick: () => {
          this.closePopover();
          this.openFlyout('Watcher');
        }
      },
      {
        name: 'View existing watches',
        icon: 'watchesApp',
        href: chrome.addBasePath(
          '/app/kibana#/management/elasticsearch/watcher'
        ),
        target: '_blank',
        onClick: () => this.closePopover()
      }
    ]);
  };

  public loadPanelItems = () => {
    this.panelItems = [];
    if (this.props.mlAvailable) {
      this.addMlPanelItems();
    }
    this.addWatcherPanelItems();
  };

  public componentDidMount() {
    this.loadPanelItems();
  }

  public componentDidUpdate(prevProps: ServiceIntegrationProps) {
    if (prevProps.mlAvailable !== this.props.mlAvailable) {
      this.loadPanelItems();
    }
  }

  public openPopover = () =>
    this.setState({
      isPopoverOpen: true
    });

  public closePopover = () =>
    this.setState({
      isPopoverOpen: false
    });

  public openFlyout = (name: FlyoutName) =>
    this.setState({ activeFlyout: name });

  public closeFlyouts = () => this.setState({ activeFlyout: null });

  public render() {
    const button = (
      <EuiButton
        iconType="arrowDown"
        iconSide="right"
        onClick={this.openPopover}
      >
        Integrations
      </EuiButton>
    );

    return (
      <React.Fragment>
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
                items: this.panelItems
              }
            ]}
          />
        </EuiPopover>
        <MachineLearningFlyout
          location={this.props.location}
          isOpen={this.state.activeFlyout === 'ML'}
          onClose={this.closeFlyouts}
          serviceName={this.props.serviceName}
          transactionType={this.props.transactionType}
          serviceTransactionTypes={this.props.serviceTransactionTypes}
        />
        <WatcherFlyout
          location={this.props.location}
          isOpen={this.state.activeFlyout === 'Watcher'}
          onClose={this.closeFlyouts}
          serviceName={this.props.serviceName}
        />
      </React.Fragment>
    );
  }
}
