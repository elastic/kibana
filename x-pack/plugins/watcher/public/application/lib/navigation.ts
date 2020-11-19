/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let router: any;
export const registerRouter = (aRouter: any) => {
  router = aRouter;
};

export const goToWatchList = () => {
  router.history.push({ pathname: `/watches` });
};

export const goToCreateThresholdAlert = () => {
  router.history.push({ pathname: `/watches/new-watch/threshold` });
};

export const goToCreateAdvancedWatch = () => {
  router.history.push({ pathname: `/watches/new-watch/json` });
};
