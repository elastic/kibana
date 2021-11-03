/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

import { AuthorizationContext } from '../../../../lib/authorization';
import { TransformListAction, TransformListRow } from '../../../../common';
import { SECTION_SLUG } from '../../../../constants';
import { useSearchItems } from '../../../../hooks/use_search_items';
import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';

import { cloneActionNameText, CloneActionName } from './clone_action_name';

export type CloneAction = ReturnType<typeof useCloneAction>;
export const useCloneAction = (forceDisable: boolean, transformNodes: number) => {
  const history = useHistory();
  const appDeps = useAppDependencies();
  const savedObjectsClient = appDeps.savedObjects.client;
  const indexPatterns = appDeps.data.indexPatterns;
  const toastNotifications = useToastNotifications();

  const { getIndexPatternIdByTitle, loadIndexPatterns } = useSearchItems(undefined);

  const { canCreateTransform } = useContext(AuthorizationContext).capabilities;

  const clickHandler = useCallback(
    async (item: TransformListRow) => {
      try {
        await loadIndexPatterns(savedObjectsClient, indexPatterns);
        const dataViewTitle = Array.isArray(item.config.source.index)
          ? item.config.source.index.join(',')
          : item.config.source.index;
        const indexPatternId = getIndexPatternIdByTitle(dataViewTitle);

        if (indexPatternId === undefined) {
          toastNotifications.addDanger(
            i18n.translate('xpack.transform.clone.noDataViewErrorPromptText', {
              defaultMessage:
                'Unable to clone the transform {transformId}. No data view exists for {dataViewTitle}.',
              values: { dataViewTitle, transformId: item.id },
            })
          );
        } else {
          history.push(
            `/${SECTION_SLUG.CLONE_TRANSFORM}/${item.id}?indexPatternId=${indexPatternId}`
          );
        }
      } catch (e) {
        toastNotifications.addError(e, {
          title: i18n.translate('xpack.transform.clone.errorPromptText', {
            defaultMessage: 'An error occurred checking if source data view exists',
          }),
        });
      }
    },
    [
      history,
      savedObjectsClient,
      indexPatterns,
      toastNotifications,
      loadIndexPatterns,
      getIndexPatternIdByTitle,
    ]
  );

  const action: TransformListAction = useMemo(
    () => ({
      name: (item: TransformListRow) => <CloneActionName disabled={!canCreateTransform} />,
      enabled: () => canCreateTransform && !forceDisable && transformNodes > 0,
      description: cloneActionNameText,
      icon: 'copy',
      type: 'icon',
      onClick: clickHandler,
      'data-test-subj': 'transformActionClone',
    }),
    [canCreateTransform, forceDisable, clickHandler, transformNodes]
  );

  return { action };
};
