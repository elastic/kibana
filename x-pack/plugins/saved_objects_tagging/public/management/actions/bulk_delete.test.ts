/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  overlayServiceMock,
  notificationServiceMock,
} from '../../../../../../src/core/public/mocks';
import { tagClientMock } from '../../services/tags/tags_client.mock';
import { TagBulkAction } from '../types';
import { getBulkDeleteAction } from './bulk_delete';

describe('bulkDeleteAction', () => {
  let tagClient: ReturnType<typeof tagClientMock.create>;
  let overlays: ReturnType<typeof overlayServiceMock.createStartContract>;
  let notifications: ReturnType<typeof notificationServiceMock.createStartContract>;
  let setLoading: jest.MockedFunction<(loading: boolean) => void>;
  let action: TagBulkAction;

  const tagIds = ['id-1', 'id-2', 'id-3'];

  beforeEach(() => {
    tagClient = tagClientMock.create();
    overlays = overlayServiceMock.createStartContract();
    notifications = notificationServiceMock.createStartContract();
    setLoading = jest.fn();

    action = getBulkDeleteAction({ tagClient, overlays, notifications, setLoading });
  });

  it('performs the operation if the confirmation is accepted', async () => {
    overlays.openConfirm.mockResolvedValue(true);

    await action.execute(tagIds);

    expect(overlays.openConfirm).toHaveBeenCalledTimes(1);

    expect(tagClient.bulkDelete).toHaveBeenCalledTimes(1);
    expect(tagClient.bulkDelete).toHaveBeenCalledWith(tagIds);

    expect(notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not perform the operation if the confirmation is rejected', async () => {
    overlays.openConfirm.mockResolvedValue(false);

    await action.execute(tagIds);

    expect(overlays.openConfirm).toHaveBeenCalledTimes(1);

    expect(tagClient.bulkDelete).not.toHaveBeenCalled();
    expect(notifications.toasts.addSuccess).not.toHaveBeenCalled();
  });

  it('does not show notification if `client.bulkDelete` rejects ', async () => {
    overlays.openConfirm.mockResolvedValue(true);
    tagClient.bulkDelete.mockRejectedValue(new Error('error calling bulkDelete'));

    await expect(action.execute(tagIds)).rejects.toMatchInlineSnapshot(
      `[Error: error calling bulkDelete]`
    );

    expect(notifications.toasts.addSuccess).not.toHaveBeenCalled();
  });
});
