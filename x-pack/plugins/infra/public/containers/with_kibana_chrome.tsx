/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Observable, Subscription } from 'rxjs';

import chrome from 'ui/chrome';
import { Breadcrumb } from 'ui/chrome/api/breadcrumbs';
import { RendererFunction } from '../utils/typed_react';

// replace with import from platform core when available
interface UiSettings {
  k7Design: boolean;
}

// replace with import from platform core when available
type UiSettings$ = Observable<{
  key: string;
  oldValue: any;
  newValue: any;
}>;

interface WithKibanaChromeProps {
  children: RendererFunction<
    {
      setBreadcrumbs: (newBreadcrumbs: Breadcrumb[]) => void;
    } & WithKibanaChromeState
  >;
}

interface WithKibanaChromeState {
  basePath: string;
  uiSettings: UiSettings;
}

const uiSettingsKeys = ['k7Design'];

export class WithKibanaChrome extends React.Component<
  WithKibanaChromeProps,
  WithKibanaChromeState
> {
  public state: WithKibanaChromeState = {
    uiSettings: {
      k7Design: chrome.getUiSettingsClient().get('k7design'),
    },
    basePath: chrome.getBasePath(),
  };

  private uiSettingsSubscription?: Subscription;

  public componentDidMount() {
    this.uiSettingsSubscription = (chrome
      .getUiSettingsClient()
      .getUpdate$() as UiSettings$).subscribe({
      next: ({ key, newValue }) => {
        if (uiSettingsKeys.includes(key)) {
          this.setState(state => ({
            ...state,
            uiSettings: {
              ...state.uiSettings,
              [key]: newValue,
            },
          }));
        }
      },
    });
  }

  public componentWillUnmount() {
    if (this.uiSettingsSubscription) {
      this.uiSettingsSubscription.unsubscribe();
    }
  }

  public render() {
    return this.props.children({
      ...this.state,
      setBreadcrumbs: chrome.breadcrumbs.set,
    });
  }
}
