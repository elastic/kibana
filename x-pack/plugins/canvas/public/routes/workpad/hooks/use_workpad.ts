/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { useWorkpadService, usePlatformService } from '../../../services';
import { getWorkpad } from '../../../state/selectors/workpad';
import { setWorkpad } from '../../../state/actions/workpad';
// @ts-expect-error
import { setAssets } from '../../../state/actions/assets';
// @ts-expect-error
import { setZoomScale } from '../../../state/actions/transient';
import { CanvasWorkpad } from '../../../../types';

const getWorkpadLabel = () =>
  i18n.translate('xpack.canvas.workpadResolve.redirectLabel', {
    defaultMessage: 'Workpad',
  });

export const useWorkpad = (
  workpadId: string,
  loadPages: boolean = true,
  getRedirectPath: (workpadId: string) => string
): [CanvasWorkpad | undefined, string | Error | undefined] => {
  const workpadService = useWorkpadService();
  const platformService = usePlatformService();
  const dispatch = useDispatch();
  const storedWorkpad = useSelector(getWorkpad);
  const [error, setError] = useState<string | Error | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const {
          outcome,
          aliasId,
          workpad: { assets, ...workpad },
        } = await workpadService.resolve(workpadId);

        if (outcome === 'conflict') {
          workpad.aliasId = aliasId;
        }

        dispatch(setAssets(assets));
        dispatch(setWorkpad(workpad, { loadPages }));
        dispatch(setZoomScale(1));

        if (outcome === 'aliasMatch' && platformService.redirectLegacyUrl && aliasId) {
          platformService.redirectLegacyUrl(`#${getRedirectPath(aliasId)}`, getWorkpadLabel());
        }
      } catch (e) {
        setError(e as Error | string);
      }
    })();
  }, [workpadId, dispatch, setError, loadPages, workpadService, getRedirectPath, platformService]);

  return [storedWorkpad.id === workpadId ? storedWorkpad : undefined, error];
};
