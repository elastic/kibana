/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { TransformListAction, TransformListRow } from '../../../../common';
import { AuthorizationContext } from '../../../../lib/authorization';

import { editActionNameText, EditActionName } from './edit_action_name';
import { useSearchItems } from '../../../../hooks/use_search_items';
import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';
import { TransformConfigUnion } from '../../../../../../common/types/transform';

export const useEditAction = (forceDisable: boolean, transformNodes: number) => {
  const { canCreateTransform } = useContext(AuthorizationContext).capabilities;

  const [config, setConfig] = useState<TransformConfigUnion>();
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [indexPatternId, setIndexPatternId] = useState<string | undefined>();

  const closeFlyout = () => setIsFlyoutVisible(false);

  const { getIndexPatternIdByTitle } = useSearchItems(undefined);
  const toastNotifications = useToastNotifications();
  const appDeps = useAppDependencies();
  const indexPatterns = appDeps.data.indexPatterns;

  const clickHandler = useCallback(
    async (item: TransformListRow) => {
      try {
        const indexPatternTitle = Array.isArray(item.config.source.index)
          ? item.config.source.index.join(',')
          : item.config.source.index;
        const currentIndexPatternId = getIndexPatternIdByTitle(indexPatternTitle);

        if (currentIndexPatternId === undefined) {
          toastNotifications.addWarning(
            i18n.translate('xpack.transform.edit.noIndexPatternErrorPromptText', {
              defaultMessage:
                'Unable to get index pattern the transform {transformId}. No index pattern exists for {indexPattern}.',
              values: { indexPattern: indexPatternTitle, transformId: item.id },
            })
          );
        }
        setIndexPatternId(currentIndexPatternId);
        setConfig(item.config);
        setIsFlyoutVisible(true);
      } catch (e) {
        toastNotifications.addError(e, {
          title: i18n.translate('xpack.transform.edit.errorPromptText', {
            defaultMessage: 'An error occurred checking if source index pattern exists',
          }),
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [indexPatterns, toastNotifications, getIndexPatternIdByTitle]
  );

  const action: TransformListAction = useMemo(
    () => ({
      name: () => <EditActionName />,
      enabled: () => canCreateTransform && !forceDisable && transformNodes > 0,
      description: editActionNameText,
      icon: 'pencil',
      type: 'icon',
      onClick: (item: TransformListRow) => clickHandler(item),
      'data-test-subj': 'transformActionEdit',
    }),
    [canCreateTransform, clickHandler, forceDisable, transformNodes]
  );

  return {
    action,
    config,
    closeFlyout,
    isFlyoutVisible,
    indexPatternId,
  };
};
