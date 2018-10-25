/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest } from 'boom';
import { BaseAction } from './base_action';
import { ACTION_TYPES } from '../../../common/constants';
import { i18n } from '@kbn/i18n';

export class UnknownAction extends BaseAction {
  constructor(props) {
    props.type = ACTION_TYPES.UNKNOWN;
    super(props);

    this.actionJson = props.actionJson;
  }

  // To Kibana
  get downstreamJson() {
    const result = super.downstreamJson;

    Object.assign(result, {
      actionJson: this.actionJson
    });

    return result;
  }

  // From Kibana
  static fromDownstreamJson(json) {
    const props = super.getPropsFromDownstreamJson(json);

    Object.assign(props, {
      actionJson: json.actionJson
    });

    return new UnknownAction(props);
  }

  // To Elasticsearch
  get upstreamJson() {
    const result = super.upstreamJson;

    result[this.id] = this.actionJson;

    return result;
  }

  // From Elasticsearch
  static fromUpstreamJson(json) {
    const props = super.getPropsFromUpstreamJson(json);

    if (!json.actionJson) {
      throw badRequest(
        i18n.translate('xpack.watcher.models.unknownAction.absenceOfActionJsonPropertyBadRequestMessage', {
          defaultMessage: 'json argument must contain an {actionJson} property',
          values: {
            actionJson: 'actionJson'
          }
        }),
      );
    }

    Object.assign(props, {
      actionJson: json.actionJson
    });

    return new UnknownAction(props);
  }

  /*
  json.actionJson should have the following structure:
  NOTE: The structure will actually vary considerably from type to type.
  {
    "logging": {
      ...
    }
  }
  */
}
