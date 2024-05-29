/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { FindSLOResponse } from '@kbn/slo-schema';
import { QueryKey, useMutation } from '@tanstack/react-query';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Annotation } from '../../../common/annotations';
import { useKibana } from '../../utils/kibana_react';

type ServerError = IHttpFetchError<ResponseErrorBody>;

interface EditAnnotationResponse {
  _id: string;
  _index: string;
  _source: Annotation;
}

export function useEditAnnotation() {
  const {
    i18n: i18nStart,
    theme,
    http,
    notifications: { toasts },
  } = useKibana().services;
  const services = useKibana().services;

  return useMutation<
    EditAnnotationResponse,
    ServerError,
    { annotation: Annotation },
    { previousData?: FindSLOResponse; queryKey?: QueryKey }
  >(
    ['createAnnotation'],
    ({ annotation }) => {
      const body = JSON.stringify(annotation);
      return http.put<EditAnnotationResponse>(`/api/observability/annotation/${annotation.id}`, {
        body,
      });
    },
    {
      onSuccess: (data, { annotation }) => {
        toasts.addSuccess(
          {
            title: toMountPoint(
              <RedirectAppLinks coreStart={services} data-test-subj="observabilityMainContainer">
                <FormattedMessage
                  id="xpack.observability.annotation.edit.successNotification"
                  defaultMessage="Successfully edit annotation {name}"
                  values={{
                    name: annotation.message,
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
      onError: (error, { annotation }, context) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.observability.edit.annotation', {
            defaultMessage: 'Something went wrong while editing annotation {message}',
            values: { message: annotation.message },
          }),
        });
      },
    }
  );
}
