/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { DEFAULT_INDEX_KEY, SecurityPageName } from '../../../../common/constants';
import { useKibana, useUiSetting$ } from '../../lib/kibana';

import { sourcererActions, sourcererModel } from '../../store/sourcerer';
import { useRouteSpy } from '../../utils/route/use_route_spy';
import { KibanaIndexPatterns } from '../../store/sourcerer/model';
import { useIndexFields } from '../source';

export const dedupeIndexName = (kibanaIndex: string[], configIndex: string[]) => {
  return [
    ...configIndex.filter((ci) =>
      kibanaIndex.reduce<boolean>((acc, kip) => {
        if (kip.includes(ci) || ci.includes(kip)) {
          return false;
        }
        return acc;
      }, true)
    ),
    ...kibanaIndex,
  ];
};

export const getSourcererScopeName = (pageName: string): sourcererModel.SourcererScopeName => {
  switch (pageName) {
    case SecurityPageName.detections:
    case SecurityPageName.overview:
    case SecurityPageName.hosts:
    case SecurityPageName.network:
    case SecurityPageName.timelines:
    case SecurityPageName.case:
    case SecurityPageName.administration:
      return sourcererModel.SourcererScopeName.default;
    default:
      return sourcererModel.SourcererScopeName.default;
  }
};

export const useInitSourcerer = () => {
  const {
    services: {
      data: { indexPatterns: indexPatternsService },
    },
  } = useKibana();
  const dispatch = useDispatch();
  const [{ pageName }] = useRouteSpy();
  const [configIndex] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  useIndexFields(getSourcererScopeName(pageName));

  const setIndexPatternsList = useCallback(
    (kibanaIndexPatterns: KibanaIndexPatterns, allIndexPatterns: string[]) => {
      dispatch(
        sourcererActions.setIndexPatternsList({
          kibanaIndexPatterns,
          allIndexPatterns,
        })
      );
    },
    [dispatch]
  );

  useEffect(() => {
    let didCancel = false;
    async function fetchTitles() {
      const kibanaIndexPatterns = await indexPatternsService.getIdsWithTitle();
      const allIndexPatterns = dedupeIndexName(
        kibanaIndexPatterns.map((kip) => kip.title),
        configIndex
      );
      if (!didCancel) {
        setIndexPatternsList(kibanaIndexPatterns, allIndexPatterns);
      }
    }
    fetchTitles();
    return () => {
      didCancel = true;
    };
  }, [configIndex, indexPatternsService, setIndexPatternsList]);
};
