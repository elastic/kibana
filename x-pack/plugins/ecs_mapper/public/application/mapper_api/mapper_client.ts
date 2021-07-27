/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';
import { FieldCopyAction } from '../../../common';

interface MapperClientConstructor {
  http: CoreStart['http'];
  notifications: CoreStart['notifications'];
}

export class MapperClient {
  private readonly http: CoreStart['http'];
  private readonly notifications: CoreStart['notifications'];

  constructor({ http, notifications }: MapperClientConstructor) {
    this.http = http;
    this.notifications = notifications;
  }

  public fetchPipelineFromMapping = async (
    file: string,
    copyAction: FieldCopyAction
  ): Promise<void> => {
    try {
      return this.http.post('/api/ecs_mapper/map/ingest_pipeline', {
        body: JSON.stringify({
          file,
          copyAction,
        }),
      });
    } catch (error) {
      this.notifications.toasts.addError(error, {
        title: i18n.translate('xpack.ecsMapper.mapToIngestPipelineError', {
          defaultMessage: 'Error',
        }),
      });
    }
  };
}
