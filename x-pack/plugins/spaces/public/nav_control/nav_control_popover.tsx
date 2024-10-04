/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PopoverAnchorPosition, WithEuiThemeProps } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiHeaderSectionItemButton,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiText,
  EuiTourStep,
  withEuiTheme,
} from '@elastic/eui';
import React, { Component, lazy, Suspense } from 'react';
import type { Observable, Subscription } from 'rxjs';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import { SpacesDescription } from './components/spaces_description';
import { SpacesMenu } from './components/spaces_menu';
import type { SolutionView, Space } from '../../common';
import type { EventTracker } from '../analytics';
import { getSpaceAvatarComponent } from '../space_avatar';
import type { SpacesManager } from '../spaces_manager';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

interface Props {
  spacesManager: SpacesManager;
  anchorPosition: PopoverAnchorPosition;
  capabilities: Capabilities;
  navigateToApp: ApplicationStart['navigateToApp'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
  serverBasePath: string;
  theme: WithEuiThemeProps['theme'];
  allowSolutionVisibility: boolean;
  eventTracker: EventTracker;
  showTour$: Observable<boolean>;
  onFinishTour: () => void;
}

interface State {
  showSpaceSelector: boolean;
  loading: boolean;
  activeSpace: Space | null;
  spaces: Space[];
  showTour: boolean;
}

const popoutContentId = 'headerSpacesMenuContent';
const tourLearnMoreLink = 'https://ela.st/left-nav';

class NavControlPopoverUI extends Component<Props, State> {
  private activeSpace$?: Subscription;
  private showTour$Sub?: Subscription;

  constructor(props: Props) {
    super(props);
    this.state = {
      showSpaceSelector: false,
      loading: false,
      activeSpace: null,
      spaces: [],
      showTour: false,
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

    this.showTour$Sub = this.props.showTour$.subscribe((showTour) => {
      this.setState({ showTour });
    });
  }

  public componentWillUnmount() {
    this.activeSpace$?.unsubscribe();
    this.showTour$Sub?.unsubscribe();
  }

  public render() {
    const button = this.getActiveSpaceButton();
    const { theme } = this.props;
    const { activeSpace } = this.state;
    const tourTexts = getTourTexts(activeSpace?.solution);
    const isTourOpen = Boolean(activeSpace) && this.state.showTour && !this.state.showSpaceSelector;

    let element: React.ReactNode;
    if (this.state.loading || this.state.spaces.length < 2) {
      element = (
        <SpacesDescription
          id={popoutContentId}
          isLoading={this.state.loading}
          toggleSpaceSelector={this.toggleSpaceSelector}
          capabilities={this.props.capabilities}
          navigateToApp={this.props.navigateToApp}
        />
      );
    } else {
      element = (
        <SpacesMenu
          id={popoutContentId}
          spaces={this.state.spaces}
          serverBasePath={this.props.serverBasePath}
          toggleSpaceSelector={this.toggleSpaceSelector}
          capabilities={this.props.capabilities}
          navigateToApp={this.props.navigateToApp}
          navigateToUrl={this.props.navigateToUrl}
          activeSpace={this.state.activeSpace}
          allowSolutionVisibility={this.props.allowSolutionVisibility}
          eventTracker={this.props.eventTracker}
        />
      );
    }

    return (
      <EuiTourStep
        content={
          <EuiText>
            <p>{tourTexts.content}</p>
            <p>
              <EuiLink href={tourLearnMoreLink} external>
                {tourTexts.learnMore}
              </EuiLink>
            </p>
          </EuiText>
        }
        isStepOpen={isTourOpen}
        minWidth={300}
        maxWidth={360}
        onFinish={this.props.onFinishTour}
        step={1}
        stepsTotal={1}
        title={tourTexts.title}
        anchorPosition="downCenter"
        footerAction={
          <EuiButtonEmpty
            size="s"
            color="text"
            onClick={this.props.onFinishTour}
            data-test-subj="closeTourBtn"
          >
            {tourTexts.closeBtn}
          </EuiButtonEmpty>
        }
        data-test-subj="spaceSolutionTour"
      >
        <EuiPopover
          id="spcMenuPopover"
          button={button}
          isOpen={this.state.showSpaceSelector}
          closePopover={this.closeSpaceSelector}
          anchorPosition={this.props.anchorPosition}
          panelPaddingSize="none"
          repositionOnScroll
          ownFocus
          zIndex={Number(theme.euiTheme.levels.navigation) + 1} // it needs to sit above the collapsible nav menu
        >
          {element}
        </EuiPopover>
      </EuiTourStep>
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

  private getAlignedLoadingSpinner() {
    return <EuiLoadingSpinner size="m" className="eui-alignMiddle" />;
  }

  private getActiveSpaceButton = () => {
    const { activeSpace } = this.state;

    if (!activeSpace) {
      return this.getButton(this.getAlignedLoadingSpinner(), 'loading spaces navigation');
    }

    return this.getButton(
      <Suspense fallback={this.getAlignedLoadingSpinner()}>
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
        aria-label={i18n.translate('xpack.spaces.navControl.popover.spacesNavigationLabel', {
          defaultMessage: 'Spaces navigation',
        })}
        aria-describedby="spacesNavDetails"
        data-test-subj="spacesNavSelector"
        title={linkTitle}
        onClick={this.toggleSpaceSelector}
      >
        {linkIcon}
        <p id="spacesNavDetails" hidden>
          {i18n.translate('xpack.spaces.navControl.popover.spaceNavigationDetails', {
            defaultMessage:
              '{space} is the currently selected space. Click this button to open a popover that allows you to select the active space.',
            values: {
              space: linkTitle,
            },
          })}
        </p>
      </EuiHeaderSectionItemButton>
    );
  };

  protected toggleSpaceSelector = () => {
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

export const NavControlPopover = withEuiTheme(NavControlPopoverUI);

function getTourTexts(solution?: SolutionView) {
  const solutionMap: Record<SolutionView, string> = {
    es: i18n.translate('xpack.spaces.navControl.tour.esSolution', {
      defaultMessage: 'search',
    }),
    security: i18n.translate('xpack.spaces.navControl.tour.securitySolution', {
      defaultMessage: 'security',
    }),
    oblt: i18n.translate('xpack.spaces.navControl.tour.obltSolution', {
      defaultMessage: 'observability',
    }),
    classic: '', // Tour is not shown for the classic solution
  };

  const title = !!solution
    ? i18n.translate('xpack.spaces.navControl.tour.title', {
        defaultMessage: 'You chose the {solution} solution view',
        values: { solution: solutionMap[solution] },
      })
    : '';

  const content = !!solution
    ? i18n.translate('xpack.spaces.navControl.tour.content', {
        defaultMessage:
          'It provides all the analytics and {solution} features you need. You can switch views or return to the classic navigation from your space settings, or create other spaces with different views.',
        values: { solution: solutionMap[solution] },
      })
    : '';

  return {
    title,
    content,
    closeBtn: i18n.translate('xpack.spaces.navControl.tour.closeBtn', {
      defaultMessage: 'Close',
    }),
    learnMore: i18n.translate('xpack.spaces.navControl.tour.learnMore', {
      defaultMessage: 'Learn more',
    }),
  };
}
