/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Attempt to get the current Kibana user's username
 * by querying the DOM
 */
export const getUserName: () => null | string = () => {
  const userMenu = document.getElementById('headerUserMenu');
  if (!userMenu) return null;

  const avatar = userMenu.querySelector('.euiAvatar');
  if (!avatar) return null;

  const username = avatar.getAttribute('aria-label');
  return username;
};
