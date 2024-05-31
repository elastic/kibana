/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { CoreStart, SavedObjectsCreateOptions } from '@kbn/core/public';
import { ContentClient } from '@kbn/content-management-plugin/public';
import { CONTENT_ID, GraphCreateIn, GraphCreateOut } from '../../../common/content_management';
import { OVERWRITE_REJECTED } from './constants';
import { confirmModalPromise } from './confirm_modal_promise';
import { GraphSavedObjectAttributes, GraphSavedObject } from '../../../common/content_management';
import { GraphWorkspaceSavedObject } from '../../types';

/**
 * Attempts to create the current object using the serialized source. If an object already
 * exists, a warning message requests an overwrite confirmation.
 * @param source - serialized version of this object what will be indexed into elasticsearch.
 * @param savedObject - VisSavedObject
 * @param options - options to pass to the saved object create method
 * @param services - provides Kibana services contentClient and overlays
 * @returns {Promise} - A promise that is resolved with the objects id if the object is
 * successfully indexed. If the overwrite confirmation was rejected, an error is thrown with
 * a confirmRejected = true parameter so that case can be handled differently than
 * a create or index error.
 * @resolved {SimpleSavedObject}
 */
export async function saveWithConfirmation(
  source: GraphSavedObjectAttributes,
  savedObject: Pick<GraphWorkspaceSavedObject, 'title' | 'getEsType' | 'displayName'>,
  options: SavedObjectsCreateOptions,
  services: { contentClient: ContentClient } & Pick<
    CoreStart,
    'overlays' | 'analytics' | 'i18n' | 'theme'
  >
): Promise<{ item: GraphSavedObject }> {
  const { contentClient, ...startServices } = services;
  try {
    return await contentClient.create<GraphCreateIn, GraphCreateOut>({
      contentTypeId: CONTENT_ID,
      data: source,
      options,
    });
  } catch (err) {
    // record exists, confirm overwriting
    if (get(err, 'res.status') === 409) {
      const confirmMessage = i18n.translate(
        'xpack.graph.confirmModal.overwriteConfirmationMessage',
        {
          defaultMessage: 'Are you sure you want to overwrite {title}?',
          values: { title: savedObject.title },
        }
      );

      const title = i18n.translate('xpack.graph.confirmModal.overwriteTitle', {
        defaultMessage: 'Overwrite {name}?',
        values: { name: savedObject.displayName },
      });
      const confirmButtonText = i18n.translate('xpack.graph.confirmModal.overwriteButtonLabel', {
        defaultMessage: 'Overwrite',
      });

      return confirmModalPromise(confirmMessage, title, confirmButtonText, startServices)
        .then(() =>
          contentClient.create<GraphCreateIn, GraphCreateOut>({
            contentTypeId: CONTENT_ID,
            data: source,
            options: {
              overwrite: true,
              ...options,
            },
          })
        )
        .catch(() => Promise.reject(new Error(OVERWRITE_REJECTED)));
    }
    return await Promise.reject(err);
  }
}
