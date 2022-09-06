/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { DataRequestContext } from '../../../actions';
import { DataRequestMeta, DataFilters } from '../../../../common/descriptor_types';

export class MockSyncContext implements DataRequestContext {
  dataFilters: DataFilters;
  isRequestStillActive: (dataId: string, requestToken: symbol) => boolean;
  onLoadError: (dataId: string, requestToken: symbol, errorMessage: string) => void;
  registerCancelCallback: (requestToken: symbol, callback: () => void) => void;
  startLoading: (dataId: string, requestToken: symbol, meta: DataRequestMeta) => void;
  stopLoading: (dataId: string, requestToken: symbol, data: object, meta: DataRequestMeta) => void;
  onJoinError: (errorMessage: string) => void;
  updateSourceData: (newData: unknown) => void;
  forceRefreshDueToDrawing: boolean;
  isForceRefresh: boolean;
  isFeatureEditorOpenForLayer: boolean;
  inspectorAdapters: Adapters;

  constructor({ dataFilters }: { dataFilters: Partial<DataFilters> }) {
    const mapFilters: DataFilters = {
      filters: [],
      timeFilters: {
        from: 'now',
        to: '15m',
        mode: 'relative',
      },
      zoom: 0,
      isReadOnly: false,
      ...dataFilters,
    };

    this.dataFilters = mapFilters;
    this.isRequestStillActive = sinon.spy();
    this.onLoadError = sinon.spy();
    this.registerCancelCallback = sinon.spy();
    this.startLoading = sinon.spy();
    this.stopLoading = sinon.spy();
    this.onJoinError = sinon.spy();
    this.updateSourceData = sinon.spy();
    this.forceRefreshDueToDrawing = false;
    this.isForceRefresh = false;
    this.isFeatureEditorOpenForLayer = false;
    this.inspectorAdapters = {
      vectorTiles: {
        addLayer: sinon.spy(),
      },
    };
  }
}
