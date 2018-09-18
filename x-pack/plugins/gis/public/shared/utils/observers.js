/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResizeChecker } from 'ui/resize_checker';
import { getStore } from '../../store/store';
import { changeBannerSize, changeNavSize } from '../../actions/ui_actions';

const navElementSelector = '.global-nav';
const globalBannerSelector = '#globalBannerList';

const assignResizeWatch = (qSelector, actionUpdate) => {
  let checker;
  let resizeElement;
  const checkExist = setInterval(() => {
    resizeElement = document.querySelector(qSelector);
    if (resizeElement) {
      checker = new ResizeChecker(resizeElement);
      checker.on('resize', () => {
        getStore().then(store => store.dispatch(actionUpdate));
      });
      clearInterval(checkExist);
    }
  }, 300); // check every 300ms
};

assignResizeWatch(navElementSelector, changeNavSize);
assignResizeWatch(globalBannerSelector, changeBannerSize);