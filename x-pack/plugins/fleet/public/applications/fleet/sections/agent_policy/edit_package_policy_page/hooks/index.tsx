/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

export function useHistoryBlock(isEdited: boolean) {
  const history = useHistory();

  useEffect(() => {
    if (!isEdited) {
      return;
    }
    return history.block(
      i18n.translate('xpack.fleet.editPackagePolicy.historyBlockMessage', {
        defaultMessage: `Are you sure you want to leave? Changes will be lost.`,
      })
    );
  }, [history, isEdited]);
}
