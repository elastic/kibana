/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Flyouts } from '../../shared/constants/flyouts';
import { URL_PARAM_KEY } from '../../../../common/hooks/use_url_state';

/**
 * Hook that returns which flyout is the user currently interacting with.
 * If the url contains timelineFlyout parameter and its value is not empty, we know the timeline flyout is rendered.
 * As it is always on top of the normal flyout, we can deduce which flyout the user is interacting with.
 */
export const useWhichFlyout = (): string => {
  const query = new URLSearchParams(window.location.search);
  const flyout =
    query.has(URL_PARAM_KEY.timelineFlyout) && query.get(URL_PARAM_KEY.timelineFlyout) !== '()'
      ? Flyouts.timeline
      : Flyouts.securitySolution;

  return flyout;
};
