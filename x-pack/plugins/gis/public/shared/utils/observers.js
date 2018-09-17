/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let navElement;
const checkExist = setInterval(() => {
  navElement = document.querySelector('.global-nav');
  if (navElement) {
    assignNavObserver();
    clearInterval(checkExist);
  }
}, 300); // check every 100ms

function assignNavObserver() {
  const mutationObserver = new MutationObserver(mutations => {
    mutations.forEach(() => {
      console.log(window.localStorage.getItem('kibana.isGlobalNavOpen'));
    });
  });

  mutationObserver.observe(navElement, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ['class']
  });
}