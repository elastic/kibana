/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { Location } from 'history';

import { UrlInputsModel } from '../../store/inputs/model';
import { TimelineUrl } from '../../../timelines/store/timeline/model';
import { CONSTANTS } from '../url_state/constants';
import { URL_STATE_KEYS, KeyUrlState, UrlState } from '../url_state/types';
import {
  replaceQueryStringInLocation,
  replaceStateKeyInQueryString,
  getQueryStringFromLocation,
} from '../url_state/helpers';
import { Query, Filter } from '../../../../../../../src/plugins/data/public';

import { SearchNavTab } from './types';

export const getSearch = (tab: SearchNavTab, urlState: UrlState): string => {
  if (tab && tab.urlKey != null && URL_STATE_KEYS[tab.urlKey] != null) {
    return URL_STATE_KEYS[tab.urlKey].reduce<Location>(
      (myLocation: Location, urlKey: KeyUrlState) => {
        let urlStateToReplace: UrlInputsModel | Query | Filter[] | TimelineUrl | string = '';

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
