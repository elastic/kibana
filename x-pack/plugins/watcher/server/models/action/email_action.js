/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseAction } from './base_action';
import { ACTION_TYPES, ERROR_CODES } from '../../../common/constants';
import { i18n } from '@kbn/i18n';

export class EmailAction extends BaseAction {
  constructor(props, errors) {
    props.type = ACTION_TYPES.EMAIL;
    super(props, errors);

    this.to = props.to;
    this.subject = props.subject;
    this.body = props.body;
  }

  // To Kibana
  get downstreamJson() {
    const result = super.downstreamJson;
    Object.assign(result, {
      to: this.to,
      subject: this.subject,
      body: this.body
    });

    return result;
  }

  // From Kibana
  static fromDownstreamJson(json) {
    const props = super.getPropsFromDownstreamJson(json);
    const { errors } = this.validateJson(json);

    Object.assign(props, {
      to: json.to,
      subject: json.subject,
      body: json.body,
    });

    const action = new EmailAction(props, errors);
    return { action, errors };
  }

  // To Elasticsearch
  get upstreamJson() {
    const result = super.upstreamJson;

    const optionalFields = {};
    if (this.subject) {
      optionalFields.subject = this.subject;
    }
    if (this.body) {
      optionalFields.body = { text: this.body };
    }

    result[this.id] = {
      email: {
        profile: 'standard',
        to: this.to,
        ...optionalFields,
      }
    };

    return result;
  }

  // From Elasticsearch
  static fromUpstreamJson(json) {
    const props = super.getPropsFromUpstreamJson(json);
    const { errors } = this.validateJson(json.actionJson);

    const optionalFields = {};

    if (json.actionJson.email.subject) {
      optionalFields.subject = json.actionJson.email.subject;
    }
    if (json.actionJson.email.body) {
      optionalFields.body = json.actionJson.email.body.text;
    }

    Object.assign(props, {
      to: json.actionJson.email.to,
      subject: json.actionJson.email.subject,
      ...optionalFields,
    });

    const action = new EmailAction(props, errors);

    return { action, errors };
  }

  static validateJson(json) {
    const errors = [];

    if (!json.email) {
      const message = i18n.translate('xpack.watcher.models.emailAction.actionJsonEmailPropertyMissingBadRequestMessage', {
        defaultMessage: 'json argument must contain an {actionJsonEmail} property',
        values: {
          actionJsonEmail: 'actionJson.email'
        }
      });

      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message
      });

      json.email = {};
    }

    if (!json.email.to) {
      const message = i18n.translate('xpack.watcher.models.emailAction.actionJsonEmailToPropertyMissingBadRequestMessage', {
        defaultMessage: 'json argument must contain an {actionJsonEmailTo} property',
        values: {
          actionJsonEmailTo: 'actionJson.email.to'
        }
      });

      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message
      });
    }

    return { errors: errors.length ? errors : null };
  }

  /*
  json.actionJson should have the following structure:
  {
    "email" : {
      "profile": "standard",
      "to" : "foo@bar.com",  // or [ "foo@bar.com", "bar@foo.com" ]
      "subject" : "foobar subject",
      "body" : {
        "text" : foobar body text"
      }
    }
  }
  */
}
