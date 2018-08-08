/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest } from 'boom';
import { BaseAction } from './base_action';
import { ACTION_TYPES } from '../../../common/constants';

export class EmailAction extends BaseAction {
  constructor(props) {
    props.type = ACTION_TYPES.EMAIL;
    super(props);

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

    Object.assign(props, {
      to: json.to,
      subject: json.subject,
      body: json.body
    });

    return new EmailAction(props);
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

    if (!json.actionJson.email) {
      throw badRequest('json argument must contain an actionJson.email property');
    }
    if (!json.actionJson.email.to) {
      throw badRequest('json argument must contain an actionJson.email.to property');
    }

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

    return new EmailAction(props);
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
