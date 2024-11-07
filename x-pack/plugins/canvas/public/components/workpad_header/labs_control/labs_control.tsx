/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiNotificationBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

import { LazyLabsFlyout, withSuspense } from '@kbn/presentation-util-plugin/public';

import { UI_SETTINGS } from '../../../../common';
import { coreServices, presentationUtilService } from '../../../services/kibana_services';

const strings = {
  getLabsButtonLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderLabsControlSettings.labsButtonLabel', {
      defaultMessage: 'Labs',
    }),
};

const Flyout = withSuspense(LazyLabsFlyout, null);

export const LabsControl = () => {
  const [isShown, setIsShown] = useState(false);

  if (!coreServices.uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI)) {
    return null;
  }

  const projects = presentationUtilService.labsService.getProjects(['canvas']);
  const overrideCount = Object.values(projects).filter(
    (project) => project.status.isOverride
  ).length;

  return (
    <>
      <EuiButtonEmpty onClick={() => setIsShown(!isShown)} size="xs">
        {strings.getLabsButtonLabel()}
        {overrideCount > 0 ? (
          <EuiNotificationBadge color="subdued" style={{ marginLeft: 4 }}>
            {overrideCount}
          </EuiNotificationBadge>
        ) : null}
      </EuiButtonEmpty>
      {isShown ? <Flyout solutions={['canvas']} onClose={() => setIsShown(false)} /> : null}
    </>
  );
};
