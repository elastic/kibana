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
  return Joi.object({
    enabled: Joi.boolean().default(true),
    email: Joi.object({
      enabled: Joi.boolean().default(false),
      smtp: Joi.object({
        host: Joi.string().default('localhost'),
        port: Joi.number().default(25),
        require_tls: Joi.boolean().default(false),
        pool: Joi.boolean().default(false),
        auth: Joi.object({
          username: Joi.string(),
          password: Joi.string()
        }).default(),
      }).default(),
      defaults: Joi.object({
        from: Joi.string(),
        to: Joi.array().single().items(Joi.string()),
        cc: Joi.array().single().items(Joi.string()),
        bcc: Joi.array().single().items(Joi.string()),
      }).default(),
    }).default(),
    slack: Joi.object({
      enabled: Joi.boolean().default(false),
      token: Joi.string().required(),
      defaults: Joi.object({
        channel: Joi.string(),
        as_user: Joi.boolean().default(false),
        icon_emoji: Joi.string(),
        icon_url: Joi.string(),
        link_names: Joi.boolean().default(true),
        mrkdwn: Joi.boolean().default(true),
        unfurl_links: Joi.boolean().default(true),
        unfurl_media: Joi.boolean().default(true),
        username: Joi.string(),
      }).default(),
    })
  }).default();
};
