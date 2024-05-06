/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { LensEmbeddableInput } from '@kbn/lens-plugin/public';
import { unmountComponentAtNode } from 'react-dom';
import type { SaveProps } from '@kbn/lens-plugin/public/plugin';
import { useKibana } from '../../lib/kibana';
import type { LensAttributes } from './types';
import { useRedirectToDashboardFromLens } from './use_redirect_to_dashboard_from_lens';
import { APP_UI_ID, SecurityPageName } from '../../../../common';
import { useGetSecuritySolutionUrl } from '../link_to';

export const useSaveToLibrary = ({
  attributes,
}: {
  attributes: LensAttributes | undefined | null;
}) => {
  const { lens, ...startServices } = useKibana().services;
  const { SaveModalComponent, canUseEditor } = lens;
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const { redirectTo, getEditOrCreateDashboardPath } = useRedirectToDashboardFromLens({
    getSecuritySolutionUrl,
  });

  const openSaveVisualizationFlyout = useCallback(() => {
    const targetDomElement = document.createElement('div');
    const mount = toMountPoint(
      <SaveModalComponent
        initialInput={attributes as unknown as LensEmbeddableInput}
        onSave={(saveProps: SaveProps) => {
          unmountComponentAtNode(targetDomElement);
        }}
        onClose={() => {
          unmountComponentAtNode(targetDomElement);
        }}
        originatingApp={APP_UI_ID}
        getOriginatingPath={(dashboardId) =>
          `${SecurityPageName.dashboards}/${getEditOrCreateDashboardPath(dashboardId)}`
        }
        redirectTo={redirectTo}
      />,
      startServices
    );

    mount(targetDomElement);
  }, [SaveModalComponent, attributes, getEditOrCreateDashboardPath, redirectTo, startServices]);

  const disableVisualizations = useMemo(
    () => !canUseEditor() || attributes == null,
    [attributes, canUseEditor]
  );

  return { openSaveVisualizationFlyout, disableVisualizations };
};
