/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CreateTagModal } from './create_modal';
import { IToasts, NotificationsStart } from '@kbn/core-notifications-browser';
import { ITagsClient, Tag } from '@kbn/saved-objects-tagging-oss-plugin/common';
import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
import { duplicateTagNameErrorMessage, managedTagConflictMessage } from './utils';

describe('create modal', () => {
  const getMockTagClient = (findByNameResult: Tag | null = null) =>
    ({
      findByName: jest.fn().mockResolvedValue(findByNameResult),
      create: jest.fn().mockResolvedValue({
        id: '1',
        name: 'tag1',
        description: 'description',
        color: 'blue',
        managed: false,
      }),
    } as Partial<ITagsClient> as ITagsClient);

  const defaultProps: React.ComponentProps<typeof CreateTagModal> = {
    onClose: jest.fn(),
    onSave: jest.fn(),
    tagClient: getMockTagClient(),
    notifications: {
      toasts: { addDanger: jest.fn() } as Partial<IToasts> as IToasts,
    } as Partial<NotificationsStart> as NotificationsStart,
  };

  it('should prevent submission if there is a duplicate name error (unmanaged)', async () => {
    const tagClientUnmanaged = getMockTagClient({
      id: '1',
      name: 'tag1',
      description: 'description',
      color: 'blue',
      managed: false,
    });

    render(
      <I18nProvider>
        <CreateTagModal {...defaultProps} tagClient={tagClientUnmanaged} />
      </I18nProvider>
    );

    const nameInput = screen.getByRole('textbox', { name: /name/i });
    await userEvent.type(nameInput, 'tag1');

    screen.findByText(duplicateTagNameErrorMessage);

    const submitButton = screen.getByRole('button', { name: /create/i });

    await userEvent.click(submitButton);

    expect(tagClientUnmanaged.create).not.toHaveBeenCalled();
  });

  it('should prevent submission if there is a duplicate name error (managed)', async () => {
    const tagClientUnmanaged = getMockTagClient({
      id: '1',
      name: 'tag1',
      description: 'description',
      color: 'blue',
      managed: true,
    });

    render(
      <I18nProvider>
        <CreateTagModal {...defaultProps} tagClient={tagClientUnmanaged} />
      </I18nProvider>
    );

    const nameInput = screen.getByRole('textbox', { name: /name/i });
    await userEvent.type(nameInput, 'tag1');

    screen.findByText(managedTagConflictMessage);

    const submitButton = screen.getByRole('button', { name: /create/i });

    await userEvent.click(submitButton);

    expect(tagClientUnmanaged.create).not.toHaveBeenCalled();
  });
});
