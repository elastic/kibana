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
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import { memoize } from 'lodash';
import React from 'react';
import chrome from 'ui/chrome';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { MachineLearningFlyout } from './MachineLearningFlyout';
import { WatcherFlyout } from './WatcherFlyout';

interface ServiceIntegrationProps {
  mlAvailable: boolean;
  location: Location;
  serviceTransactionTypes: string[];
  urlParams: IUrlParams;
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

  public getPanelItems = memoize((mlAvailable: boolean) => {
    let panelItems: EuiContextMenuPanelItemDescriptor[] = [];
    if (mlAvailable) {
      panelItems = panelItems.concat(this.getMLPanelItems());
    }
    return panelItems.concat(this.getWatcherPanelItems());
  });

  public getMLPanelItems = () => {
    return [
      {
        name: i18n.translate(
          'xpack.apm.serviceDetails.integrationsMenu.enableMLAnomalyDetectionButtonLabel',
          {
            defaultMessage: 'Enable ML anomaly detection'
          }
        ),
        icon: 'machineLearningApp',
        toolTipContent: i18n.translate(
          'xpack.apm.serviceDetails.integrationsMenu.enableMLAnomalyDetectionButtonTooltip',
          {
            defaultMessage: 'Set up a machine learning job for this service'
          }
        ),
        onClick: () => {
          this.closePopover();
          this.openFlyout('ML');
        }
      },
      {
        name: i18n.translate(
          'xpack.apm.serviceDetails.integrationsMenu.viewMLJobsButtonLabel',
          {
            defaultMessage: 'View existing ML jobs'
          }
        ),
        icon: 'machineLearningApp',
        href: chrome.addBasePath('/app/ml'),
        target: '_blank',
        onClick: () => this.closePopover()
      }
    ];
  };

  public getWatcherPanelItems = () => {
    return [
      {
        name: i18n.translate(
          'xpack.apm.serviceDetails.integrationsMenu.enableWatcherErrorReportsButtonLabel',
          {
            defaultMessage: 'Enable watcher error reports'
          }
        ),
        icon: 'watchesApp',
        onClick: () => {
          this.closePopover();
          this.openFlyout('Watcher');
        }
      },
      {
        name: i18n.translate(
          'xpack.apm.serviceDetails.integrationsMenu.viewWatchesButtonLabel',
          {
            defaultMessage: 'View existing watches'
          }
        ),
        icon: 'watchesApp',
        href: chrome.addBasePath(
          '/app/kibana#/management/elasticsearch/watcher'
        ),
        target: '_blank',
        onClick: () => this.closePopover()
      }
    ];
  };

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
        {i18n.translate(
          'xpack.apm.serviceDetails.integrationsMenu.integrationsButtonLabel',
          {
            defaultMessage: 'Integrations'
          }
        )}
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
                items: this.getPanelItems(this.props.mlAvailable)
              }
            ]}
          />
        </EuiPopover>
        <MachineLearningFlyout
          location={this.props.location}
          isOpen={this.state.activeFlyout === 'ML'}
          onClose={this.closeFlyouts}
          urlParams={this.props.urlParams}
          serviceTransactionTypes={this.props.serviceTransactionTypes}
        />
        <WatcherFlyout
          location={this.props.location}
          isOpen={this.state.activeFlyout === 'Watcher'}
          onClose={this.closeFlyouts}
          urlParams={this.props.urlParams}
        />
      </React.Fragment>
    );
  }
}
