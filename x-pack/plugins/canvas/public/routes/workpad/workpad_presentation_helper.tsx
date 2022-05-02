/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { FC, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { getBaseBreadcrumb, getWorkpadBreadcrumb } from '../../lib/breadcrumbs';
// @ts-expect-error
import { setDocTitle } from '../../lib/doc_title';
import { getWorkpad } from '../../state/selectors/workpad';
import { useFullscreenPresentationHelper } from './hooks/use_fullscreen_presentation_helper';
import { useAutoplayHelper } from './hooks/use_autoplay_helper';
import { useRefreshHelper } from './hooks/use_refresh_helper';
import { usePlatformService } from '../../services';

const getWorkpadLabel = () =>
  i18n.translate('xpack.canvas.workpadConflict.redirectLabel', {
    defaultMessage: 'Workpad',
  });

export const WorkpadPresentationHelper: FC = ({ children }) => {
  const platformService = usePlatformService();
  const workpad = useSelector(getWorkpad);
  useFullscreenPresentationHelper();
  useAutoplayHelper();
  useRefreshHelper();
  const history = useHistory();

  useEffect(() => {
    platformService.setBreadcrumbs([
      getBaseBreadcrumb(history),
      getWorkpadBreadcrumb({ name: workpad.name }),
    ]);
  }, [workpad.name, workpad.id, platformService, history]);

  useEffect(() => {
    setDocTitle(workpad.name);
  }, [workpad.name]);

  const conflictElement = workpad.aliasId
    ? platformService.getLegacyUrlConflict?.({
        objectNoun: getWorkpadLabel(),
        currentObjectId: workpad.id,
        otherObjectId: workpad.aliasId,
        otherObjectPath: `/workpad/${workpad.aliasId}`,
      })
    : null;

  return (
    <>
      {conflictElement}
      {children}
    </>
  );
};
