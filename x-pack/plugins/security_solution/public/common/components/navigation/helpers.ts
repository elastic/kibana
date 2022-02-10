/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { Location } from 'history';

import type { Filter, Query } from '@kbn/es-query';
import { UrlInputsModel } from '../../store/inputs/model';
import { TimelineUrl } from '../../../timelines/store/timeline/model';
import { CONSTANTS } from '../url_state/constants';
import { KeyUrlState, UrlState, isAdministration, ALL_URL_STATE_KEYS } from '../url_state/types';
import {
  replaceQueryStringInLocation,
  replaceStateKeyInQueryString,
  getQueryStringFromLocation,
} from '../url_state/helpers';

import { SearchNavTab } from './types';
import { SourcererUrlState } from '../../store/sourcerer/model';

export const getSearch = (tab: SearchNavTab, urlState: UrlState): string => {
  if (tab && tab.urlKey != null && !isAdministration(tab.urlKey)) {
    return ALL_URL_STATE_KEYS.reduce<Location>(
      (myLocation: Location, urlKey: KeyUrlState) => {
        let urlStateToReplace:
          | Filter[]
          | Query
          | SourcererUrlState
          | TimelineUrl
          | UrlInputsModel
          | string = '';

        if (urlKey === CONSTANTS.appQuery && urlState.query != null) {
          if (urlState.query.query === '') {
            urlStateToReplace = '';
          } else {
            urlStateToReplace = urlState.query;
          }
        } else if (urlKey === CONSTANTS.filters && urlState.filters != null) {
          if (isEmpty(urlState.filters)) {
            urlStateToReplace = '';
          } else {
            urlStateToReplace = urlState.filters;
          }
        } else if (urlKey === CONSTANTS.timerange) {
          urlStateToReplace = urlState[CONSTANTS.timerange];
        } else if (urlKey === CONSTANTS.sourcerer) {
          urlStateToReplace = urlState[CONSTANTS.sourcerer];
        } else if (urlKey === CONSTANTS.timeline && urlState[CONSTANTS.timeline] != null) {
          const timeline = urlState[CONSTANTS.timeline];
          if (timeline.id === '') {
            urlStateToReplace = '';
          } else {
            urlStateToReplace = timeline;
          }
        }
        return replaceQueryStringInLocation(
          myLocation,
          replaceStateKeyInQueryString(
            urlKey,
            urlStateToReplace
          )(getQueryStringFromLocation(myLocation.search))
        );
      },
      {
        pathname: '',
        hash: '',
        search: '',
        state: '',
      }
    ).search;
  }
  return '';
};
