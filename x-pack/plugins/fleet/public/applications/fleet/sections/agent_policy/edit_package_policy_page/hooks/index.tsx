/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

import { useStartServices } from '../../../../hooks';

export function useHistoryBlock(isEdited: boolean) {
  const history = useHistory();
  const { overlays, application } = useStartServices();

  useEffect(() => {
    if (!isEdited) {
      return;
    }

    const unblock = history.block((state) => {
      async function confirmAsync() {
        const confirmRes = await overlays.openConfirm(
          i18n.translate('xpack.fleet.editPackagePolicy.historyBlockDescription', {
            defaultMessage: `Unsaved changes will be discarded. Are you sure you would like to continue?`,
          }),
          {
            title: i18n.translate('xpack.fleet.editPackagePolicy.historyBlockTitle', {
              defaultMessage: 'Discard Changes?',
            }),
          }
        );

        if (confirmRes) {
          unblock();

          application.navigateToUrl(state.pathname + state.hash + state.search, {
            state: state.state,
          });
        }
      }
      confirmAsync();
      return false;
    });

    return unblock;
  }, [history, isEdited, overlays, application]);
}
