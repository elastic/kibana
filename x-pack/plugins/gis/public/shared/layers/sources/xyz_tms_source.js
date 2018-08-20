/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export class XYZTMSSource {

  static type = 'EMS_XYZ';

  static createDescriptor(urlTemplate) {
    return {
      type: XYZTMSSource.type,
      urlTemplate: urlTemplate
    };
  }

  static async getTMSOptions(descriptor) {
    return {
      url: descriptor.urlTemplate
    };
  }

  static renderEditor() {
    return (<div />);
  }

}
