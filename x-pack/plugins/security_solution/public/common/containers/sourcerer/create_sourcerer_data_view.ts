/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DataViewListItem,
  DataViewsContract,
  DataView as DataViewType,
} from '@kbn/data-views-plugin/common';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ensurePatternFormat } from '../../../../common/utils/sourcerer';
import type { KibanaDataView } from '../../store/sourcerer/model';
import { DEFAULT_TIME_FIELD } from '../../../../common/constants';
import { getSourcererDataView } from './get_sourcerer_data_view';

export interface GetSourcererDataView {
  signal?: AbortSignal;
  body: {
    patternList: string[];
  };
  dataViewService: DataViewsContract;
  dataViewId: string | null;
}

export interface SecurityDataView {
  defaultDataView: KibanaDataView;
  kibanaDataViews: Array<Omit<KibanaDataView, 'fields'>>;
}

export const createSourcererDataView = async ({
  body,
  dataViewService,
  dataViewId,
}: GetSourcererDataView): Promise<SecurityDataView | undefined> => {
  if (dataViewId === null) {
    return;
  }
  let allDataViews: DataViewListItem[] = await dataViewService.getIdsWithTitle();
  const siemDataViewExist = allDataViews.find((dv) => dv.id === dataViewId);

  const { patternList } = body;
  const patternListAsTitle = ensurePatternFormat(patternList).join();
  let siemDataView: DataViewType;
  if (siemDataViewExist === undefined) {
    try {
      siemDataView = await dataViewService.createAndSave(
        {
          allowNoIndex: true,
          id: dataViewId,
          title: patternListAsTitle,
          timeFieldName: DEFAULT_TIME_FIELD,
        },
        // Override property - if a data view exists with the security solution pattern
        // delete it and replace it with our data view
        true
      );
    } catch (err) {
      const error = transformError(err);
      if (err.name === 'DuplicateDataViewError' || error.statusCode === 409) {
        siemDataView = await dataViewService.get(dataViewId);
      } else {
        throw error;
      }
    }
  } else {
    const siemDataViewTitle = siemDataViewExist
      ? ensurePatternFormat(siemDataViewExist.title.split(',')).join()
      : '';
    siemDataView = await dataViewService.get(dataViewId);

    if (patternListAsTitle !== siemDataViewTitle) {
      siemDataView.title = patternListAsTitle;
      await dataViewService.updateSavedObject(siemDataView);
    }
  }

  if (allDataViews.some((dv) => dv.id === dataViewId)) {
    allDataViews = allDataViews.map((v) =>
      v.id === dataViewId ? { ...v, title: patternListAsTitle } : v
    );
  } else if (siemDataView !== null) {
    allDataViews.push({ id: siemDataView.id ?? dataViewId, title: siemDataView?.title });
  }

  const siemSourcererDataView = await getSourcererDataView(dataViewId, dataViewService);

  return {
    defaultDataView: siemSourcererDataView,
    kibanaDataViews: allDataViews.map((dv) =>
      dv.id === dataViewId
        ? siemSourcererDataView
        : {
            id: dv.id,
            patternList: dv.title.split(','),
            title: dv.title,
          }
    ),
  };
};
