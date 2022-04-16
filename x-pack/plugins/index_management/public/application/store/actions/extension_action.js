/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reloadIndices } from '.';
import { notificationService } from '../../services/notification';
import { httpService } from '../../services/http';

export const performExtensionAction =
  ({ requestMethod, indexNames, successMessage }) =>
  async (dispatch) => {
    try {
      await requestMethod(indexNames, httpService.httpClient);
    } catch (error) {
      notificationService.showDangerToast(error.message);
      return;
    }
    dispatch(reloadIndices(indexNames));
    notificationService.showSuccessToast(successMessage);
  };
