/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PopoverAnchorPosition } from '@elastic/eui';
import { EuiHeaderSectionItemButton, EuiLoadingSpinner, EuiPopover } from '@elastic/eui';
import React, { Component, lazy, Suspense } from 'react';
import type { Subscription } from 'rxjs';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';

import type { Space } from '../../common';
import { getSpaceAvatarComponent } from '../space_avatar';
import type { SpacesManager } from '../spaces_manager';
import { SpacesDescription } from './components/spaces_description';
import { SpacesMenu } from './components/spaces_menu';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

interface Props {
  spacesManager: SpacesManager;
  anchorPosition: PopoverAnchorPosition;
  capabilities: Capabilities;
  navigateToApp: ApplicationStart['navigateToApp'];
  serverBasePath: string;
}

interface State {
  showSpaceSelector: boolean;
  loading: boolean;
  activeSpace: Space | null;
  spaces: Space[];
}

const popoutContentId = 'headerSpacesMenuContent';

export class NavControlPopover extends Component<Props, State> {
  private activeSpace$?: Subscription;

  constructor(props: Props) {
    super(props);
    this.state = {
      showSpaceSelector: false,
      loading: false,
      activeSpace: null,
      spaces: [],
    };
  }

  public componentDidMount() {
    this.activeSpace$ = this.props.spacesManager.onActiveSpaceChange$.subscribe({
      next: (activeSpace) => {
        this.setState({
          activeSpace,
        });
      },
    });
  }

  public componentWillUnmount() {
    if (this.activeSpace$) {
      this.activeSpace$.unsubscribe();
    }
  }

  public render() {
    const button = this.getActiveSpaceButton();

    let element: React.ReactNode;
    if (!this.state.loading && this.state.spaces.length < 2) {
      element = (
        <SpacesDescription
          id={popoutContentId}
          onManageSpacesClick={this.toggleSpaceSelector}
          capabilities={this.props.capabilities}
          navigateToApp={this.props.navigateToApp}
        />
      );
    } else {
      element = (
        <SpacesMenu
          id={popoutContentId}
          spaces={this.state.spaces}
          isLoading={this.state.loading}
          serverBasePath={this.props.serverBasePath}
          onManageSpacesClick={this.toggleSpaceSelector}
          capabilities={this.props.capabilities}
          navigateToApp={this.props.navigateToApp}
        />
      );
    }

    return (
      <EuiPopover
        id="spcMenuPopover"
        button={button}
        isOpen={this.state.showSpaceSelector}
        closePopover={this.closeSpaceSelector}
        anchorPosition={this.props.anchorPosition}
        panelPaddingSize="none"
        repositionOnScroll
        ownFocus
      >
        {element}
      </EuiPopover>
    );
  }

  private async loadSpaces() {
    const { spacesManager } = this.props;

    if (this.state.loading) {
      return;
    }

    this.setState({
      loading: true,
    });

    const spaces = await spacesManager.getSpaces();

    this.setState({
      spaces,
      loading: false,
    });
  }

  private getActiveSpaceButton = () => {
    const { activeSpace } = this.state;

    if (!activeSpace) {
      return this.getButton(<EuiLoadingSpinner size="m" />, 'loading');
    }

    return this.getButton(
      <Suspense fallback={<EuiLoadingSpinner size="m" />}>
        <LazySpaceAvatar space={activeSpace} size={'s'} />
      </Suspense>,
      (activeSpace as Space).name
    );
  };

  private getButton = (linkIcon: JSX.Element, linkTitle: string) => {
    return (
      <EuiHeaderSectionItemButton
        aria-controls={popoutContentId}
        aria-expanded={this.state.showSpaceSelector}
        aria-haspopup="true"
        aria-label={linkTitle}
        data-test-subj="spacesNavSelector"
        title={linkTitle}
        onClick={this.toggleSpaceSelector}
      >
        {linkIcon}
      </EuiHeaderSectionItemButton>
    );
  };

  private toggleSpaceSelector = () => {
    const isOpening = !this.state.showSpaceSelector;
    if (isOpening) {
      this.loadSpaces();
    }

    this.setState({
      showSpaceSelector: !this.state.showSpaceSelector,
    });
  };

  private closeSpaceSelector = () => {
    this.setState({
      showSpaceSelector: false,
    });
  };
}
