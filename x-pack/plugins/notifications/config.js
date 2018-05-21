/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * User-configurable settings for xpack.notifications via configuration schema
 *
 * @param {Object} Joi - HapiJS Joi module that allows for schema validation
 * @return {Object} config schema
 */
export const config = (Joi) => {
  const { array, boolean, number, object, string } = Joi;

  return object({
    enabled: boolean().default(true),
    email: object({
      enabled: boolean().default(false),
      smtp: object({
        host: string().default('localhost'),
        port: number().default(25),
        require_tls: boolean().default(false),
        pool: boolean().default(false),
        auth: object({
          username: string(),
          password: string()
        }).default(),
      }).default(),
      defaults: object({
        from: string(),
        to: array().single().items(string()),
        cc: array().single().items(string()),
        bcc: array().single().items(string()),
      }).default(),
    }).default(),
    slack: object({
      enabled: boolean().default(false),
      token: string().required(),
      defaults: object({
        channel: string(),
        as_user: boolean().default(false),
        icon_emoji: string(),
        icon_url: string(),
        link_names: boolean().default(true),
        mrkdwn: boolean().default(true),
        unfurl_links: boolean().default(true),
        unfurl_media: boolean().default(true),
        username: string(),
      }).default(),
    })
  }).default();
};
