/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { useSeriesStorage } from '../../hooks/use_series_storage';

interface Props {
  seriesId: string;
}

export function RemoveSeries({ seriesId }: Props) {
  const { removeSeries } = useSeriesStorage();

  const onClick = () => {
    removeSeries(seriesId);
  };
  return (
    <EuiButtonIcon
      aria-label={i18n.translate('xpack.observability.expView.seriesEditor.removeSeries', {
        defaultMessage: 'Click to remove series',
      })}
      iconType="cross"
      color="primary"
      onClick={onClick}
      size="m"
    />
  );
}
