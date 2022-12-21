/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { RefObject } from 'react';

import { SeriesEditor } from '../series_editor/series_editor';
import { AddSeriesButton } from './add_series_button';
import { PanelId } from '../exploratory_view';

export function SeriesViews({
  seriesBuilderRef,
}: {
  seriesBuilderRef: RefObject<HTMLDivElement>;
  onSeriesPanelCollapse: (panel: PanelId) => void;
}) {
  return (
    <div ref={seriesBuilderRef}>
      <SeriesEditor />
      <AddSeriesButton />
    </div>
  );
}
