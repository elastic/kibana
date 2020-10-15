/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { DataRequestContext } from '../../../actions';
import { DataMeta, MapFilters } from '../../../../common/descriptor_types';

export class MockSyncContext implements DataRequestContext {
  dataFilters: MapFilters;
  isRequestStillActive: (dataId: string, requestToken: symbol) => boolean;
  onLoadError: (dataId: string, requestToken: symbol, errorMessage: string) => void;
  registerCancelCallback: (requestToken: symbol, callback: () => void) => void;
  startLoading: (dataId: string, requestToken: symbol, meta: DataMeta) => void;
  stopLoading: (dataId: string, requestToken: symbol, data: object, meta: DataMeta) => void;
  updateSourceData: (newData: unknown) => void;

  constructor({ dataFilters }: { dataFilters: Partial<MapFilters> }) {
    const mapFilters: MapFilters = {
      filters: [],
      timeFilters: {
        from: 'now',
        to: '15m',
        mode: 'relative',
      },
      zoom: 0,
      ...dataFilters,
    };

    this.dataFilters = mapFilters;
    this.isRequestStillActive = sinon.spy();
    this.onLoadError = sinon.spy();
    this.registerCancelCallback = sinon.spy();
    this.startLoading = sinon.spy();
    this.stopLoading = sinon.spy();
    this.updateSourceData = sinon.spy();
  }
}
