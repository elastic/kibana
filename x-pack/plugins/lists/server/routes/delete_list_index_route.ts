/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_INDEX } from '../../common/constants';
import { buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/siem_common_deps';
import { acknowledgeSchema } from '../../common/schemas';

import { getListClient } from '.';

/**
 * Deletes all of the indexes, template, ilm policies, and aliases. You can check
 * this by looking at each of these settings from ES after a deletion:
 *
 * GET /_template/.lists-default
 * GET /.lists-default-000001/
 * GET /_ilm/policy/.lists-default
 * GET /_alias/.lists-default
 *
 * GET /_template/.items-default
 * GET /.items-default-000001/
 * GET /_ilm/policy/.items-default
 * GET /_alias/.items-default
 *
 * And ensuring they're all gone
 */
export const deleteListIndexRoute = (router: IRouter): void => {
  router.delete(
    {
      options: {
        tags: ['access:lists'],
      },
      path: LIST_INDEX,
      validate: false,
    },
    async (context, _, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const lists = getListClient(context);
        const listIndexExists = await lists.getListIndexExists();
        const listItemIndexExists = await lists.getListItemIndexExists();

        if (!listIndexExists && !listItemIndexExists) {
          return siemResponse.error({
            body: `index: "${lists.getListIndex()}" and "${lists.getListItemIndex()}" does not exist`,
            statusCode: 404,
          });
        } else {
          if (listIndexExists) {
            await lists.deleteListIndex();
          }
          if (listItemIndexExists) {
            await lists.deleteListItemIndex();
          }

          const listsPolicyExists = await lists.getListPolicyExists();
          const listItemPolicyExists = await lists.getListItemPolicyExists();

          if (listsPolicyExists) {
            await lists.deleteListPolicy();
          }
          if (listItemPolicyExists) {
            await lists.deleteListItemPolicy();
          }

          const listsTemplateExists = await lists.getListTemplateExists();
          const listItemTemplateExists = await lists.getListItemTemplateExists();

          if (listsTemplateExists) {
            await lists.deleteListTemplate();
          }
          if (listItemTemplateExists) {
            await lists.deleteListItemTemplate();
          }

          const [validated, errors] = validate({ acknowledged: true }, acknowledgeSchema);
          if (errors != null) {
            return siemResponse.error({ body: errors, statusCode: 500 });
          } else {
            return response.ok({ body: validated ?? {} });
          }
        }
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
