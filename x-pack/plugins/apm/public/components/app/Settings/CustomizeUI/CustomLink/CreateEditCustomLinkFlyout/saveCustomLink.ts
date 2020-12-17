/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import {
  Filter,
  CustomLink,
} from '../../../../../../../common/custom_link/custom_link_types';
import { callApmApi } from '../../../../../../services/rest/createCallApmApi';

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
      await callApmApi({
        pathname: '/api/apm/settings/custom_links/{id}',
        method: 'PUT',
        params: {
          path: { id },
          body: customLink,
        },
      });
    } else {
      await callApmApi({
        pathname: '/api/apm/settings/custom_links',
        method: 'POST',
        params: {
          body: customLink,
        },
      });
    }
    toasts.addSuccess({
      iconType: 'check',
      title: i18n.translate(
        'xpack.apm.settings.customizeUI.customLink.create.successed',
        { defaultMessage: 'Link saved!' }
      ),
    });
  } catch (error) {
    toasts.addDanger({
      title: i18n.translate(
        'xpack.apm.settings.customizeUI.customLink.create.failed',
        { defaultMessage: 'Link could not be saved!' }
      ),
      text: i18n.translate(
        'xpack.apm.settings.customizeUI.customLink.create.failed.message',
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
