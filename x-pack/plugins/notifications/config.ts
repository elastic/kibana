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
export function config(Joi: any) {
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
          password: Joi.string(),
        }).default(),
      }).default(),
      defaults: Joi.object({
        from: Joi.string(),
        to: Joi.array()
          .single()
          .items(Joi.string()),
        cc: Joi.array()
          .single()
          .items(Joi.string()),
        bcc: Joi.array()
          .single()
          .items(Joi.string()),
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
    }),
  }).default();
}

import { schema, TypeOf } from '@kbn/config-schema';

const createNotificationSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  email: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
    smtp: schema.object({
      host: schema.maybe(schema.string({ defaultValue: 'localhost' })),
      port: schema.maybe(schema.number({ defaultValue: 25 })),
      require_tls: schema.maybe(schema.boolean({ defaultValue: false })),
      pool: schema.maybe(schema.boolean({ defaultValue: false })),
      auth: schema.object({
        username: schema.maybe(schema.string({ defaultValue: 'kibana' })),
        password: schema.maybe(schema.string({ defaultValue: 'password' })),
      }),
    }),
    defaults: schema.object({
      from: schema.maybe(schema.string()),
      to: schema.maybe(schema.arrayOf(schema.string())),
      cc: schema.maybe(schema.arrayOf(schema.string())),
      bcc: schema.maybe(schema.arrayOf(schema.string())),
    }),
  }),
  slack: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
    token: schema.maybe(schema.string()),
    defaults: schema.object({
      channel: schema.maybe(schema.string()),
      as_user: schema.maybe(schema.boolean({ defaultValue: false })),
      icon_emoji: schema.maybe(schema.string()),
      icon_url: schema.maybe(schema.string()),
      link_names: schema.maybe(schema.boolean({ defaultValue: true })),
      mrkdwn: schema.maybe(schema.boolean({ defaultValue: true })),
      unfurl_links: schema.maybe(schema.boolean({ defaultValue: true })),
      unfurl_media: schema.maybe(schema.boolean({ defaultValue: true })),
      username: schema.maybe(schema.string()),
    }),
  }),
});

type NotificationConfigType = TypeOf<typeof createNotificationSchema>;

export class NotificationConfig {
  /**
   * @internal
   */
  public static schema = createNotificationSchema;

  public enabled: boolean;
  public email: {
    enabled: boolean;
    smtp: {
      host?: string;
      port?: number;
      require_tls?: boolean;
      pool?: boolean;
      auth?: {
        username?: string;
        password?: string;
      };
    };
    defaults?: {
      from?: string;
      to?: string[];
      cc?: string[];
      bcc?: string[];
    };
  };
  public slack: {
    enabled: boolean;
    token?: string;
    defaults: {
      channel?: string;
      as_user?: boolean;
      icon_emoji?: string;
      icon_url?: string;
      link_names?: boolean;
      mrkdwn?: boolean;
      unfurl_links?: boolean;
      unfurl_media?: boolean;
      username?: string;
    };
  };

  /**
   * @internal
   */
  constructor(cfg: NotificationConfigType) {
    this.enabled = cfg.enabled;
    this.slack = cfg.slack;
    this.email = cfg.email;
  }
}
