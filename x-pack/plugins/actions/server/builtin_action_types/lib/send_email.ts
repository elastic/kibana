/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// info on nodemailer: https://nodemailer.com/about/
import nodemailer from 'nodemailer';
import { default as MarkdownIt } from 'markdown-it';

import { Logger } from '../../../../../../src/core/server';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { CustomHostSettings } from '../../config';

// an email "service" which doesn't actually send, just returns what it would send
export const JSON_TRANSPORT_SERVICE = '__json';

export interface SendEmailOptions {
  transport: Transport;
  routing: Routing;
  content: Content;
  hasAuth: boolean;
  configurationUtilities: ActionsConfigurationUtilities;
}

// config validation ensures either service is set or host/port are set
export interface Transport {
  user?: string;
  password?: string;
  service?: string; // see: https://nodemailer.com/smtp/well-known/
  host?: string;
  port?: number;
  secure?: boolean; // see: https://nodemailer.com/smtp/#tls-options
}

export interface Routing {
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
}

export interface Content {
  subject: string;
  message: string;
}

// send an email
export async function sendEmail(logger: Logger, options: SendEmailOptions): Promise<unknown> {
  const { transport, routing, content, configurationUtilities, hasAuth } = options;
  const { service, host, port, secure, user, password } = transport;
  const { from, to, cc, bcc } = routing;
  const { subject, message } = content;

  // The transport options do not seem to be exposed as a type, and we reference
  // some deep properties, so need to use any here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transportConfig: Record<string, any> = {};
  const proxySettings = configurationUtilities.getProxySettings();
  const rejectUnauthorized = configurationUtilities.isRejectUnauthorizedCertificatesEnabled();

  if (hasAuth && user != null && password != null) {
    transportConfig.auth = {
      user,
      pass: password,
    };
  }

  let useProxy = !!proxySettings;

  if (host) {
    if (proxySettings?.proxyBypassHosts && proxySettings?.proxyBypassHosts?.has(host)) {
      useProxy = false;
    }
    if (proxySettings?.proxyOnlyHosts && !proxySettings?.proxyOnlyHosts?.has(host)) {
      useProxy = false;
    }
  }
  let customHostSettings: CustomHostSettings | undefined;

  if (service === JSON_TRANSPORT_SERVICE) {
    transportConfig.jsonTransport = true;
    delete transportConfig.auth;
  } else if (service != null) {
    transportConfig.service = service;
  } else {
    transportConfig.host = host;
    transportConfig.port = port;
    transportConfig.secure = !!secure;
    customHostSettings = configurationUtilities.getCustomHostSettings(`smtp://${host}:${port}`);

    if (proxySettings && useProxy) {
      transportConfig.tls = {
        // do not fail on invalid certs if value is false
        rejectUnauthorized: proxySettings?.proxyRejectUnauthorizedCertificates,
      };
      transportConfig.proxy = proxySettings.proxyUrl;
      transportConfig.headers = proxySettings.proxyHeaders;
    } else if (!transportConfig.secure && user == null && password == null) {
      // special case - if secure:false && user:null && password:null set
      // rejectUnauthorized false, because simple/test servers that don't even
      // authenticate rarely have valid certs; eg cloud proxy, and npm maildev
      transportConfig.tls = { rejectUnauthorized: false };
    } else {
      transportConfig.tls = { rejectUnauthorized };
    }

    // finally, allow customHostSettings to override some of the settings
    // see: https://nodemailer.com/smtp/
    if (customHostSettings) {
      const tlsConfig: Record<string, unknown> = {};
      const tlsSettings = customHostSettings.tls;
      const smtpSettings = customHostSettings.smtp;

      if (tlsSettings?.certificateAuthoritiesData) {
        tlsConfig.ca = tlsSettings?.certificateAuthoritiesData;
      }
      if (tlsSettings?.rejectUnauthorized !== undefined) {
        tlsConfig.rejectUnauthorized = tlsSettings?.rejectUnauthorized;
      }

      if (!transportConfig.tls) {
        transportConfig.tls = tlsConfig;
      } else {
        transportConfig.tls = { ...transportConfig.tls, ...tlsConfig };
      }

      if (smtpSettings?.ignoreTLS) {
        transportConfig.ignoreTLS = true;
      } else if (smtpSettings?.requireTLS) {
        transportConfig.requireTLS = true;
      }
    }
  }

  const nodemailerTransport = nodemailer.createTransport(transportConfig);
  const messageHTML = htmlFromMarkdown(logger, message);

  const email = {
    // email routing
    from,
    to,
    cc,
    bcc,
    // email content
    subject,
    html: messageHTML,
    text: message,
  };

  const result = await nodemailerTransport.sendMail(email);

  if (service === JSON_TRANSPORT_SERVICE) {
    try {
      result.message = JSON.parse(result.message);
    } catch (err) {
      // try parsing the message for ease of debugging, on error, ignore
    }
  }

  return result;
}

// try rendering markdown to html, return markdown on any kind of error
function htmlFromMarkdown(logger: Logger, markdown: string) {
  try {
    const md = MarkdownIt({
      linkify: true,
    });

    return md.render(markdown);
  } catch (err) {
    logger.debug(`error rendering markdown to html: ${err.message}`);

    return markdown;
  }
}
