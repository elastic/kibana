/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { getBaseBreadcrumb, getWorkpadBreadcrumb } from '../../lib/breadcrumbs';
// @ts-expect-error
import { setDocTitle } from '../../lib/doc_title';
import { getWorkpad } from '../../state/selectors/workpad';
import { useFullscreenPresentationHelper } from './hooks/use_fullscreen_presentation_helper';
import { useAutoplayHelper } from './hooks/use_autoplay_helper';
import { useRefreshHelper } from './hooks/use_refresh_helper';
import { useServices } from '../../services';

export const WorkpadPresentationHelper: FC = ({ children }) => {
  const services = useServices();
  const workpad = useSelector(getWorkpad);
  useFullscreenPresentationHelper();
  useAutoplayHelper();
  useRefreshHelper();

  useEffect(() => {
    services.platform.setBreadcrumbs([
      getBaseBreadcrumb(),
      getWorkpadBreadcrumb({ name: workpad.name, id: workpad.id }),
    ]);
  }, [workpad.name, workpad.id, services.platform]);

  useEffect(() => {
    setDocTitle(workpad.name);
  }, [workpad.name]);

  return <>{children}</>;
};
