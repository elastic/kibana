/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResizeChecker } from 'ui/resize_checker';
import { getStore } from '../../store/store';
import { changeBannerVisible, changeNavExpanded }
  from '../../actions/ui_actions';

const navElementSelector = '.global-nav';
const navElementExpanded = () => window.localStorage
  .getItem('kibana.isGlobalNavOpen');

const globalBannerSelector = '#globalBannerList';
const globalBannerVisible = () => {
  const { offsetWidth, offsetHeight } = document
    .querySelector(globalBannerSelector);
  return !!(offsetWidth * offsetHeight);
};

const assignResizeWatch = (qSelector, actionUpdate, getElemStatus) => {
  let checker;
  let resizeElement;
  const checkExist = setInterval(() => {
    resizeElement = document.querySelector(qSelector);
    if (resizeElement) {
      checker = new ResizeChecker(resizeElement);
      checker.on('resize', () => {
        const newStatus = getElemStatus();
        getStore().then(store => store.dispatch(
          () => actionUpdate(newStatus)));
      });
      clearInterval(checkExist);
    }
  }, 300); // check every 300ms
};

assignResizeWatch(navElementSelector, changeNavExpanded, navElementExpanded);
assignResizeWatch(globalBannerSelector, changeBannerVisible, globalBannerVisible);