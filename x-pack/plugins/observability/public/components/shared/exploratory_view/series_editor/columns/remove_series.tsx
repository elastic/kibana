/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { DataSeries } from '../../types';
import { useUrlStorage } from '../../hooks/use_url_strorage';

interface Props {
  series: DataSeries;
}

export function RemoveSeries({ series }: Props) {
  const { removeSeries } = useUrlStorage();

  const onClick = () => {
    removeSeries(series.id);
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
