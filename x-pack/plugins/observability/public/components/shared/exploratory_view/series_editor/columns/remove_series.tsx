/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { useSeriesStorage } from '../../hooks/use_series_storage';

interface Props {
  seriesId: number;
}

export function RemoveSeries({ seriesId }: Props) {
  const { removeSeries, allSeries } = useSeriesStorage();

  const onClick = () => {
    removeSeries(seriesId);
  };

  const isDisabled = seriesId === 0 && allSeries.length > 1;

  return (
    <EuiContextMenuItem
      key=""
      icon="trash"
      onClick={onClick}
      aria-label={i18n.translate('xpack.observability.expView.seriesEditor.removeSeries', {
        defaultMessage: 'Remove series',
      })}
      disabled={isDisabled}
      toolTipContent={
        isDisabled
          ? i18n.translate('xpack.observability.expView.seriesEditor.removeSeriesDisabled', {
              defaultMessage:
                'Main series cannot be removed. Please remove all series below before you can remove this.',
            })
          : ''
      }
    >
      {i18n.translate('xpack.observability.expView.seriesEditor.removeSeries', {
        defaultMessage: 'Remove series',
      })}
    </EuiContextMenuItem>
  );
}
