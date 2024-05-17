/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import usePrevious from 'react-use/lib/usePrevious';
import { CanvasWorkpad, State } from '../../../../types';
import { notifyError } from '../../../lib/assets';
import { useNotifyService, useWorkpadService } from '../../../services';
import { canUserWrite } from '../../../state/selectors/app';
import { getWorkpad } from '../../../state/selectors/workpad';

export const useWorkpadPersist = () => {
  const service = useWorkpadService();
  const notifyService = useNotifyService();

  // Watch for workpad state and then persist those changes
  const [workpad, canWrite]: [CanvasWorkpad, boolean] = useSelector((state: State) => [
    getWorkpad(state),
    canUserWrite(state),
  ]);

  const previousWorkpad = usePrevious(workpad);

  const workpadChanged = previousWorkpad && workpad !== previousWorkpad;

  useEffect(() => {
    if (canWrite) {
      if (workpadChanged) {
        service.updateWorkpad(workpad.id, workpad).catch((err) => {
          notifyError(err, notifyService.error);
        });
      }
    }
  }, [service, workpad, workpadChanged, canWrite, notifyService.error]);
};
