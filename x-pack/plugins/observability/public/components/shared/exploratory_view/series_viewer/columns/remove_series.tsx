/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
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
    <EuiToolTip
      content={
        isDisabled
          ? i18n.translate('xpack.observability.expView.seriesEditor.removeSeriesDisabled', {
              defaultMessage:
                'Main series cannot be removed. Please remove all series below before you can remove this.',
            })
          : i18n.translate('xpack.observability.expView.seriesEditor.removeSeries', {
              defaultMessage: 'Remove series',
            })
      }
    >
      <EuiButtonIcon
        aria-label={i18n.translate('xpack.observability.expView.seriesEditor.removeSeries', {
          defaultMessage: 'Remove series',
        })}
        iconType="trash"
        color="text"
        onClick={onClick}
        size="s"
        isDisabled={isDisabled}
      />
    </EuiToolTip>
  );
}
