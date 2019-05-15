/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';

import { IHttpResponse } from 'angular';
import { EventEmitter } from 'events';
import { Space } from '../../common/model/space';

export class SpacesManager extends EventEmitter {
  private httpAgent: any;
  private baseUrl: any;
  private spaceSelectorURL: string;

  constructor(httpAgent: any, chrome: any, spaceSelectorURL: string) {
    super();
    this.httpAgent = httpAgent;
    this.baseUrl = chrome.addBasePath(`/api/spaces`);
    this.spaceSelectorURL = spaceSelectorURL;
  }

  public async getSpaces(): Promise<Space[]> {
    return await this.httpAgent
      .get(`${this.baseUrl}/space`)
      .then((response: IHttpResponse<Space[]>) => response.data);
  }

  public async getSpace(id: string): Promise<Space> {
    return await this.httpAgent
      .get(`${this.baseUrl}/space/${id}`)
      .then((response: IHttpResponse<Space[]>) => response.data);
  }

  public async createSpace(space: Space) {
    return await this.httpAgent.post(`${this.baseUrl}/space`, space);
  }

  public async updateSpace(space: Space) {
    return await this.httpAgent.put(`${this.baseUrl}/space/${space.id}?overwrite=true`, space);
  }

  public async deleteSpace(space: Space) {
    return await this.httpAgent.delete(`${this.baseUrl}/space/${space.id}`);
  }

  public async changeSelectedSpace(space: Space) {
    return await this.httpAgent
      .post(`${this.baseUrl}/v1/space/${space.id}/select`)
      .then((response: IHttpResponse<any>) => {
        if (response.data && response.data.location) {
          window.location = response.data.location;
        } else {
          this._displayError();
        }
      })
      .catch(() => this._displayError());
  }

  public redirectToSpaceSelector() {
    window.location.href = this.spaceSelectorURL;
  }

  public async requestRefresh() {
    this.emit('request_refresh');
  }

  public _displayError() {
    toastNotifications.addDanger({
      title: i18n.translate('xpack.spaces.spacesManager.unableToChangeSpaceWarningTitle', {
        defaultMessage: 'Unable to change your Space',
      }),
      text: i18n.translate('xpack.spaces.spacesManager.unableToChangeSpaceWarningDescription', {
        defaultMessage: 'please try again later',
      }),
    });
  }
}
