/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { AuthorizationContext } from '../../../../lib/authorization';
import { TransformListAction, TransformListRow } from '../../../../common';
import { SECTION_SLUG } from '../../../../constants';

import { cloneActionNameText, CloneActionName } from './clone_action_name';

export type CloneAction = ReturnType<typeof useCloneAction>;
export const useCloneAction = (forceDisable: boolean) => {
  const history = useHistory();

  const { canCreateTransform } = useContext(AuthorizationContext).capabilities;

  const clickHandler = useCallback(
    (item: TransformListRow) => {
      history.push(`/${SECTION_SLUG.CLONE_TRANSFORM}/${item.id}`);
    },
    [history]
  );

  const action: TransformListAction = useMemo(
    () => ({
      name: (item: TransformListRow) => <CloneActionName disabled={!canCreateTransform} />,
      enabled: () => canCreateTransform && !forceDisable,
      description: cloneActionNameText,
      icon: 'copy',
      type: 'icon',
      onClick: clickHandler,
      'data-test-subj': 'transformActionClone',
    }),
    [canCreateTransform, forceDisable, clickHandler]
  );

  return { action };
};
