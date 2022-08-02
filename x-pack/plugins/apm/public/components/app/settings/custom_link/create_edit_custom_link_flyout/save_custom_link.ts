/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { NotificationsStart } from '@kbn/core/public';
import {
  Filter,
  CustomLink,
} from '../../../../../../common/custom_link/custom_link_types';
import { callApmApi } from '../../../../../services/rest/create_call_apm_api';

export async function saveCustomLink({
  id,
  label,
  url,
  filters,
  toasts,
}: {
  id?: string;
  label: string;
  url: string;
  filters: Filter[];
  toasts: NotificationsStart['toasts'];
}) {
  try {
    const customLink: CustomLink = {
      label,
      url,
      filters: filters.filter(({ key, value }) => key && value),
    };

    if (id) {
      await callApmApi('PUT /internal/apm/settings/custom_links/{id}', {
        signal: null,
        params: {
          path: { id },
          body: customLink,
        },
      });
    } else {
      await callApmApi('POST /internal/apm/settings/custom_links', {
        signal: null,
        params: {
          body: customLink,
        },
      });
    }
    toasts.addSuccess({
      iconType: 'check',
      title: i18n.translate('xpack.apm.settings.customLink.create.successed', {
        defaultMessage: 'Link saved!',
      }),
    });
  } catch (error) {
    toasts.addDanger({
      title: i18n.translate('xpack.apm.settings.customLink.create.failed', {
        defaultMessage: 'Link could not be saved!',
      }),
      text: i18n.translate(
        'xpack.apm.settings.customLink.create.failed.message',
        {
          defaultMessage:
            'Something went wrong when saving the link. Error: "{errorMessage}"',
          values: {
            errorMessage: error.message,
          },
        }
      ),
    });
  }
}
