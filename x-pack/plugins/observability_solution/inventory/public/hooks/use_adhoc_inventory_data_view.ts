/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { useEffect, useState } from 'react';
import { useKibana } from './use_kibana';
import { ENTITIES_LATEST_ALIAS } from '../../common/entities';

export function useAdHocInventoryDataView() {
  const {
    services: { dataViews, notifications },
  } = useKibana();
  const [dataView, setDataView] = useState<DataView | undefined>();

  useEffect(() => {
    async function fetchDataView() {
      try {
        const displayError = false;
        return await dataViews.create({ title: ENTITIES_LATEST_ALIAS }, undefined, displayError);
      } catch (e) {
        const noDataScreen = e.message.includes('No matching indices found');
        if (noDataScreen) {
          return;
        }

        notifications.toasts.addDanger({
          title: i18n.translate('xpack.inventory.data_view.creation_failed', {
            defaultMessage: 'An error occurred while creating the data view',
          }),
          text: e.message,
        });

        throw e;
      }
    }

    fetchDataView().then(setDataView);
  }, [dataViews, notifications.toasts]);

  return { dataView };
}
