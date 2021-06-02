/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useServices } from '../../../services';
import { getWorkpad } from '../../../state/selectors/workpad';
import { setWorkpad } from '../../../state/actions/workpad';
// @ts-expect-error
import { setAssets } from '../../../state/actions/assets';
// @ts-expect-error
import { setZoomScale } from '../../../state/actions/transient';
import { CanvasWorkpad } from '../../../../types';

export const useWorkpad = (
  workpadId: string,
  loadPages: boolean = true
): [CanvasWorkpad | undefined, string | Error | undefined] => {
  const services = useServices();
  const dispatch = useDispatch();
  const storedWorkpad = useSelector(getWorkpad);
  const [error, setError] = useState<string | Error | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const { assets, ...workpad } = await services.workpad.get(workpadId);
        dispatch(setAssets(assets));
        dispatch(setWorkpad(workpad, { loadPages }));
        dispatch(setZoomScale(1));
      } catch (e) {
        setError(e);
      }
    })();
  }, [workpadId, services.workpad, dispatch, setError, loadPages]);

  return [storedWorkpad.id === workpadId ? storedWorkpad : undefined, error];
};
