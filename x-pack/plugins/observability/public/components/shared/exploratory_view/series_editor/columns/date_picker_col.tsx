/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SeriesDatePicker } from '../../series_date_picker';

interface Props {
  seriesId: string;
}
export function DatePickerCol({ seriesId }: Props) {
  return (
    <div style={{ maxWidth: 300 }}>
      <SeriesDatePicker seriesId={seriesId} />
    </div>
  );
}
