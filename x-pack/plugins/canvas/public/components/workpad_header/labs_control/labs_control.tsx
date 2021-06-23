/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiNotificationBadge } from '@elastic/eui';

import {
  LazyLabsFlyout,
  withSuspense,
} from '../../../../../../../src/plugins/presentation_util/public';

import { ComponentStrings } from '../../../../i18n';
import { useLabsService } from '../../../services';
const { LabsControl: strings } = ComponentStrings;

const Flyout = withSuspense(LazyLabsFlyout, null);

export const LabsControl = () => {
  const { isLabsEnabled, getProjects } = useLabsService();
  const [isShown, setIsShown] = useState(false);

  if (!isLabsEnabled()) {
    return null;
  }

  const projects = getProjects(['canvas']);
  const overrideCount = Object.values(projects).filter((project) => project.status.isOverride)
    .length;

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
