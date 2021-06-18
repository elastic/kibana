/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import moment from 'moment';
// @ts-expect-error
import { getDefaultWorkpad } from '../../state/defaults';
import { canUserWrite as canUserWriteSelector } from '../../state/selectors/app';
import { getWorkpad } from '../../state/selectors/workpad';
import { getId } from '../../lib/get_id';
import { downloadWorkpad } from '../../lib/download_workpad';
import { ComponentStrings, ErrorStrings } from '../../../i18n';
import { State, CanvasWorkpad } from '../../../types';
import { useNotifyService, useWorkpadService, usePlatformService } from '../../services';
// @ts-expect-error
import { WorkpadLoader as Component } from './workpad_loader';

const { WorkpadLoader: strings } = ComponentStrings;
const { WorkpadLoader: errors } = ErrorStrings;

type WorkpadStatePromise = ReturnType<ReturnType<typeof useWorkpadService>['find']>;
type WorkpadState = WorkpadStatePromise extends PromiseLike<infer U> ? U : never;

export const WorkpadLoader: FC<{ onClose: () => void }> = ({ onClose }) => {
  const fromState = useSelector((state: State) => ({
    workpadId: getWorkpad(state).id,
    canUserWrite: canUserWriteSelector(state),
  }));

  const [workpadsState, setWorkpadsState] = useState<WorkpadState | null>(null);
  const workpadService = useWorkpadService();
  const notifyService = useNotifyService();
  const platformService = usePlatformService();
  const history = useHistory();

  const createWorkpad = useCallback(
    async (_workpad: CanvasWorkpad | null | undefined) => {
      const workpad = _workpad || getDefaultWorkpad();
      if (workpad != null) {
        try {
          await workpadService.create(workpad);
          history.push(`/workpad/${workpad.id}/page/1`);
        } catch (err) {
          notifyService.error(err, {
            title: errors.getUploadFailureErrorMessage(),
          });
        }
        return;
      }
    },
    [workpadService, notifyService, history]
  );

  const findWorkpads = useCallback(
    async (text) => {
      try {
        const fetchedWorkpads = await workpadService.find(text);
        setWorkpadsState(fetchedWorkpads);
      } catch (err) {
        notifyService.error(err, { title: errors.getFindFailureErrorMessage() });
      }
    },
    [notifyService, workpadService]
  );

  const onDownloadWorkpad = useCallback((workpadId: string) => downloadWorkpad(workpadId), []);

  const cloneWorkpad = useCallback(
    async (workpadId: string) => {
      try {
        const workpad = await workpadService.get(workpadId);
        workpad.name = strings.getClonedWorkpadName(workpad.name);
        workpad.id = getId('workpad');
        await workpadService.create(workpad);
        history.push(`/workpad/${workpad.id}/page/1`);
      } catch (err) {
        notifyService.error(err, { title: errors.getCloneFailureErrorMessage() });
      }
    },
    [notifyService, workpadService, history]
  );

  const removeWorkpads = useCallback(
    (workpadIds: string[]) => {
      if (workpadsState === null) {
        return;
      }

      const removedWorkpads = workpadIds.map(async (id) => {
        try {
          await workpadService.remove(id);
          return { id, err: null };
        } catch (err) {
          return { id, err };
        }
      });

      return Promise.all(removedWorkpads).then((results) => {
        let redirectHome = false;

        const [passes, errored] = results.reduce<[string[], string[]]>(
          ([passesArr, errorsArr], result) => {
            if (result.id === fromState.workpadId && !result.err) {
              redirectHome = true;
            }

            if (result.err) {
              errorsArr.push(result.id);
            } else {
              passesArr.push(result.id);
            }

            return [passesArr, errorsArr];
          },
          [[], []]
        );

        const remainingWorkpads = workpadsState.workpads.filter(({ id }) => !passes.includes(id));

        const workpadState = {
          total: remainingWorkpads.length,
          workpads: remainingWorkpads,
        };

        if (errored.length > 0) {
          notifyService.error(errors.getDeleteFailureErrorMessage());
        }

        setWorkpadsState(workpadState);

        if (redirectHome) {
          history.push('/');
        }

        return errored;
      });
    },
    [history, workpadService, fromState.workpadId, workpadsState, notifyService]
  );

  const formatDate = useCallback(
    (date: any) => {
      const dateFormat = platformService.getUISetting('dateFormat');
      return date && moment(date).format(dateFormat);
    },
    [platformService]
  );

  const { workpadId, canUserWrite } = fromState;

  return (
    <Component
      {...{
        downloadWorkpad: onDownloadWorkpad,
        workpads: workpadsState,
        workpadId,
        canUserWrite,
        cloneWorkpad,
        createWorkpad,
        findWorkpads,
        removeWorkpads,
        formatDate,
        onClose,
      }}
    />
  );
};
