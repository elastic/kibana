/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import nodemailerGetService from 'nodemailer/lib/well-known';
import SMTPConnection from 'nodemailer/lib/smtp-connection';
import { ILicenseState } from '../lib';
import { AdditionalEmailServices, INTERNAL_BASE_ACTION_API_PATH } from '../../common';
import { ActionsRequestHandlerContext } from '../types';
import { verifyAccessAndContext } from './verify_access_and_context';
import { ELASTIC_CLOUD_SERVICE } from '../builtin_action_types/email';

const paramSchema = schema.object({
  service: schema.string(),
});

export const getWellKnownEmailServiceRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector/_email_config/{service}`,
      validate: {
        params: paramSchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const { service } = req.params;

        let response: SMTPConnection.Options = {};
        if (service === AdditionalEmailServices.ELASTIC_CLOUD) {
          response = ELASTIC_CLOUD_SERVICE;
        } else {
          const serviceEntry = nodemailerGetService(service);
          if (serviceEntry) {
            response = {
              host: serviceEntry.host,
              port: serviceEntry.port,
              secure: serviceEntry.secure,
            };
          }
        }

        return res.ok({
          body: response,
        });
      })
    )
  );
};
