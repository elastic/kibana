/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { TransformListAction, TransformListRow } from '../../../../common';
import { useTransformCapabilities } from '../../../../hooks';

import { editActionNameText, EditActionName } from './edit_action_name';
import { useSearchItems } from '../../../../hooks/use_search_items';
import { useToastNotifications } from '../../../../app_dependencies';
import { TransformConfigUnion } from '../../../../../../common/types/transform';

export type EditAction = ReturnType<typeof useEditAction>;
export const useEditAction = (forceDisable: boolean, transformNodes: number) => {
  const { canCreateTransform } = useTransformCapabilities();

  const [config, setConfig] = useState<TransformConfigUnion>();
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [dataViewId, setDataViewId] = useState<string | undefined>();

  const closeFlyout = () => setIsFlyoutVisible(false);

  const { loadDataViewByEsIndexPattern } = useSearchItems(undefined);
  const toastNotifications = useToastNotifications();

  const clickHandler = useCallback(
    async (item: TransformListRow) => {
      try {
        const { dataViewId: currentDataViewId, dataViewTitle } = await loadDataViewByEsIndexPattern(
          item.config.source.index
        );

        if (currentDataViewId === undefined) {
          toastNotifications.addWarning(
            i18n.translate('xpack.transform.edit.noDataViewErrorPromptText', {
              defaultMessage:
                'Unable to get the data view for the transform {transformId}. No data view exists for {dataViewTitle}.',
              values: { dataViewTitle, transformId: item.id },
            })
          );
        }
        setDataViewId(currentDataViewId);
        setConfig(item.config);
        setIsFlyoutVisible(true);
      } catch (e) {
        toastNotifications.addError(e, {
          title: i18n.translate('xpack.transform.edit.errorPromptText', {
            defaultMessage: 'An error occurred checking if source data view exists',
          }),
        });
      }
    },

    [toastNotifications, loadDataViewByEsIndexPattern]
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
    dataViewId,
  };
};
