/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
export const useCloneAction = (forceDisable: boolean) => {
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
        const indexPatternTitle = Array.isArray(item.config.source.index)
          ? item.config.source.index.join(',')
          : item.config.source.index;
        const indexPatternId = getIndexPatternIdByTitle(indexPatternTitle);

        if (indexPatternId === undefined) {
          toastNotifications.addDanger(
            i18n.translate('xpack.transform.clone.noIndexPatternErrorPromptText', {
              defaultMessage:
                'Unable to clone the transform . No index pattern exists for {indexPattern}.',
              values: { indexPattern: indexPatternTitle },
            })
          );
        } else {
          history.push(
            `/${SECTION_SLUG.CLONE_TRANSFORM}/${item.id}?indexPatternId=${indexPatternId}`
          );
        }
      } catch (e) {
        toastNotifications.addDanger(
          i18n.translate('xpack.transform.clone.errorPromptText', {
            defaultMessage: 'An error occurred checking if source index pattern exists',
          })
        );
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
