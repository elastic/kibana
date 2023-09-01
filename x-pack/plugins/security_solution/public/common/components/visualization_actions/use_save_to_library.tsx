/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { LensEmbeddableInput } from '@kbn/lens-plugin/public';
import { unmountComponentAtNode } from 'react-dom';
import type { SaveProps } from '@kbn/lens-plugin/public/plugin';
import type { DashboardSaveProps } from '@kbn/lens-plugin/public/app_plugin/tags_saved_object_save_modal_dashboard_wrapper';
import { useKibana, useToasts } from '../../lib/kibana';
import { ADDED_TO_LIBRARY } from './translations';
import type { LensAttributes } from './types';
import { useRedirectToDashboardFromLens } from './use_redirect_to_dashboard_from_lens';
import { APP_UI_ID } from '../../../../common';

export const useSaveToLibrary = ({
  attributes,
}: {
  attributes: LensAttributes | undefined | null;
}) => {
  const { lens, theme, i18n } = useKibana().services;
  const { addSuccess } = useToasts();
  const [saveModalProps, setSaveModalProps] = useState<DashboardSaveProps | undefined>(undefined);
  const { SaveModalComponent, canUseEditor } = lens;
  const redirectTo = useRedirectToDashboardFromLens();

  const openSaveVisualizationFlyout = useCallback(() => {
    const targetDomElement = document.createElement('div');
    const mount = toMountPoint(
      <SaveModalComponent
        initialInput={attributes as unknown as LensEmbeddableInput}
        onSave={(saveProps: DashboardSaveProps) => {
          setSaveModalProps(saveProps);
          unmountComponentAtNode(targetDomElement);
          addSuccess(ADDED_TO_LIBRARY);
        }}
        onClose={() => {
          unmountComponentAtNode(targetDomElement);
        }}
        // originatingApp={APP_UI_ID}
        returnToOriginSwitchLabel={'xxx'}
        // originatingPath={
        //   saveModalProps?.dashboardId
        //     ? `dashboards/${saveModalProps.dashboardId}/edit`
        //     : `dashboards/create`
        // }
        redirectTo={redirectTo}
      />,
      { theme, i18n }
    );

    mount(targetDomElement);
  }, [SaveModalComponent, addSuccess, attributes, i18n, redirectTo, theme]);

  const disableVisualizations = useMemo(
    () => !canUseEditor() || attributes == null,
    [attributes, canUseEditor]
  );

  return { openSaveVisualizationFlyout, disableVisualizations };
};
