/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { encode } from '@kbn/rison';
import type { CreateSLOInput, CreateSLOResponse, FindSLOResponse } from '@kbn/slo-schema';
import { QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
import { EuiLink } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { useKibana } from '../utils/kibana_react';
import { paths } from '../../common/locators/paths';
import { sloKeys } from './query_key_factory';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useCreateSlo() {
  const {
    i18n: i18nStart,
    theme,
    application: { navigateToUrl },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const services = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation<
    CreateSLOResponse,
    ServerError,
    { slo: CreateSLOInput },
    { previousData?: FindSLOResponse; queryKey?: QueryKey }
  >(
    ['createSlo'],
    ({ slo }) => {
      const body = JSON.stringify(slo);
      return http.post<CreateSLOResponse>(`/api/observability/slos`, { body });
    },
    {
      onSuccess: (data, { slo }) => {
        queryClient.invalidateQueries({ queryKey: sloKeys.lists(), exact: false });

        const sloEditUrl = http.basePath.prepend(paths.sloEdit(data.id));

        toasts.addSuccess(
          {
            title: toMountPoint(
              <RedirectAppLinks coreStart={services} data-test-subj="observabilityMainContainer">
                <FormattedMessage
                  id="xpack.slo.slo.create.successNotification"
                  defaultMessage='Successfully created SLO: "{name}". {editSLO}'
                  values={{
                    name: slo.name,
                    editSLO: (
                      <EuiLink data-test-subj="o11yUseCreateSloEditSloLink" href={sloEditUrl}>
                        {i18n.translate('xpack.slo.useCreateSlo.editSLOLinkLabel', {
                          defaultMessage: 'Edit SLO',
                        })}
                      </EuiLink>
                    ),
                  }}
                />
              </RedirectAppLinks>,
              {
                i18n: i18nStart,
                theme,
              }
            ),
          },
          {
            toastLifeTimeMs: 30000,
          }
        );
      },
      onError: (error, { slo }, context) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.create.errorNotification', {
            defaultMessage: 'Something went wrong while creating {name}',
            values: { name: slo.name },
          }),
        });

        navigateToUrl(http.basePath.prepend(paths.sloCreateWithEncodedForm(encode(slo))));
      },
    }
  );
}
