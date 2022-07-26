/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONSTANTS } from '../url_state/constants';
import type { SearchNavTab } from './types';
import { TimelineTabs } from '../../../../common/types/timeline';
import { getSearch } from './helpers';

describe('helpers', () => {
  it('returns the search string', () => {
    const serachNavTab: SearchNavTab = { urlKey: 'host', isDetailPage: false };
    const globalQueryString = 'test=123';
    const urlState = {
      [CONSTANTS.timeline]: {
        activeTab: TimelineTabs.query,
        id: '123',
        isOpen: false,
      },
    };

    expect(getSearch(serachNavTab, urlState, globalQueryString)).toEqual(
      "?timeline=(activeTab:query,id:'123',isOpen:!f)&test=123"
    );
  });

  it('returns an empty string when global globalQueryString and urlState are empty', () => {
    const serachNavTab: SearchNavTab = { urlKey: 'host', isDetailPage: false };
    const globalQueryString = '';
    const urlState = {
      [CONSTANTS.timeline]: {
        activeTab: TimelineTabs.query,
        id: '',
        isOpen: false,
      },
    };

    expect(getSearch(serachNavTab, urlState, globalQueryString)).toEqual('');
  });

  it('returns the search string when global globalQueryString is empty', () => {
    const serachNavTab: SearchNavTab = { urlKey: 'host', isDetailPage: false };
    const globalQueryString = '';
    const urlState = {
      [CONSTANTS.timeline]: {
        activeTab: TimelineTabs.query,
        id: '123',
        isOpen: false,
      },
    };

    expect(getSearch(serachNavTab, urlState, globalQueryString)).toEqual(
      "?timeline=(activeTab:query,id:'123',isOpen:!f)"
    );
  });

  it('returns the search string when global urlState is empty', () => {
    const serachNavTab: SearchNavTab = { urlKey: 'host', isDetailPage: false };
    const globalQueryString = 'test=123';
    const urlState = {
      [CONSTANTS.timeline]: {
        activeTab: TimelineTabs.query,
        id: '',
        isOpen: false,
      },
    };

    expect(getSearch(serachNavTab, urlState, globalQueryString)).toEqual('?test=123');
  });
});
