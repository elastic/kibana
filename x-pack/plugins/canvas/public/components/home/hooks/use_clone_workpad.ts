/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import { useNotifyService, useWorkpadService } from '../../../services';
import { ErrorStrings, ComponentStrings } from '../../../../i18n';
import { getId } from '../../../lib/get_id';

const { workpadLoader: errors } = ErrorStrings;
const { useCloneWorkpad: strings } = ComponentStrings;

export const useCloneWorkpad = () => {
  const workpadService = useWorkpadService();
  const notifyService = useNotifyService();
  const history = useHistory();

  return useCallback(
    async (workpadId: string) => {
      try {
        let workpad = await workpadService.get(workpadId);

        workpad = {
          ...workpad,
          name: strings.getClonedWorkpadName(workpad.name),
          id: getId('workpad'),
        };

        await workpadService.create(workpad);

        history.push(`/workpad/${workpad.id}/page/1`);
      } catch (err) {
        notifyService.error(err, { title: errors.getCloneFailureErrorMessage() });
      }
    },
    [notifyService, workpadService, history]
  );
};
