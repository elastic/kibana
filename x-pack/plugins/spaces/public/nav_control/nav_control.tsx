/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { BehaviorSubject, from, of, switchMap } from 'rxjs';

import type { CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

import { SHOW_SPACE_SOLUTION_TOUR_SETTING } from '../../common/constants';
import type { EventTracker } from '../analytics';
import type { ConfigType } from '../config';
import type { SpacesManager } from '../spaces_manager';

function initTour(core: CoreStart, spacesManager: SpacesManager) {
  const showTourUiSettingValue = core.settings.globalClient.get(
    SHOW_SPACE_SOLUTION_TOUR_SETTING,
    true
  );
  const showTour$ = new BehaviorSubject(showTourUiSettingValue);

  const showTourObservable$ = from(spacesManager.getSpaces()).pipe(
    switchMap((spaces) => {
      if (spaces.length === 0 || spaces.length > 1) return of(false); // Don't show the tour if there are multiple spaces

      const defaultSpace = spaces[0];
      if (!defaultSpace.solution || defaultSpace.solution === 'classic') return of(false); // Don't show the tour if the default space is the classic solution

      return showTour$.asObservable();
    })
  );

  const onFinishTour = () => {
    core.settings.globalClient.set(SHOW_SPACE_SOLUTION_TOUR_SETTING, false).catch(() => {
      // Silently swallow errors, the user will just see the tour again next time they load the page
    });
    showTour$.next(false);
  };

  return { showTour$: showTourObservable$, onFinishTour };
}

export function initSpacesNavControl(
  spacesManager: SpacesManager,
  core: CoreStart,
  config: ConfigType,
  eventTracker: EventTracker
) {
  const { showTour$, onFinishTour } = initTour(core, spacesManager);

  core.chrome.navControls.registerLeft({
    order: 1000,
    mount(targetDomElement: HTMLElement) {
      if (core.http.anonymousPaths.isAnonymous(window.location.pathname)) {
        return () => null;
      }

      const LazyNavControlPopover = lazy(() =>
        import('./nav_control_popover').then(({ NavControlPopover }) => ({
          default: NavControlPopover,
        }))
      );

      ReactDOM.render(
        <KibanaRenderContextProvider {...core}>
          <Suspense fallback={<EuiLoadingSpinner />}>
            <LazyNavControlPopover
              spacesManager={spacesManager}
              serverBasePath={core.http.basePath.serverBasePath}
              anchorPosition="downLeft"
              capabilities={core.application.capabilities}
              navigateToApp={core.application.navigateToApp}
              navigateToUrl={core.application.navigateToUrl}
              allowSolutionVisibility={config.allowSolutionVisibility}
              eventTracker={eventTracker}
              showTour$={showTour$}
              onFinishTour={onFinishTour}
            />
          </Suspense>
        </KibanaRenderContextProvider>,
        targetDomElement
      );

      return () => {
        ReactDOM.unmountComponentAtNode(targetDomElement);
      };
    },
  });
}
